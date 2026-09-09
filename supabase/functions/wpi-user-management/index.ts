import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const roles = ["admin", "manager", "reviewer", "editor", "viewer"] as const;
type AppRole = (typeof roles)[number];

type RequestBody = {
  action?: "list" | "invite" | "update" | "activity" | "reset_password";
  email?: string;
  displayName?: string;
  phone?: string;
  role?: AppRole;
  isActive?: boolean;
  userId?: string;
  redirectTo?: string;
};

function readNamedKey(jsonName: string, fallbackName: string) {
  const raw = Deno.env.get(jsonName);
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
    } catch {
      // Fall back to the legacy single-key environment variable.
    }
  }
  return Deno.env.get(fallbackName) ?? "";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey = readNamedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secretKey = readNamedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!url || !publishableKey || !secretKey || !token) {
      return json({ error: "用户管理服务配置不完整" }, 500);
    }

    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "登录状态已失效" }, 401);
    }

    const currentUserId = authData.user.id;
    const { data: currentMembership, error: membershipError } = await adminClient
      .from("wpi_organization_members")
      .select("organization_id, role, is_active")
      .eq("user_id", currentUserId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipError || !currentMembership) {
      return json({ error: "当前账号没有有效组织" }, 403);
    }

    const organizationId = String(currentMembership.organization_id);
    const currentRole = String(currentMembership.role) as AppRole;
    if (currentRole !== "admin") {
      return json({ error: "仅系统管理员可管理组织用户" }, 403);
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const action = body.action ?? "list";

    if (action === "list") {
      const [{ data: members, error: membersError }, { data: organization }] = await Promise.all([
        adminClient
          .from("wpi_organization_members")
          .select("user_id, role, is_active, joined_at, updated_at")
          .eq("organization_id", organizationId)
          .order("joined_at", { ascending: true }),
        adminClient.from("wpi_organizations").select("id, code, name").eq("id", organizationId).maybeSingle(),
      ]);
      if (membersError) throw membersError;

      const userIds = (members ?? []).map((item) => String(item.user_id));
      const { data: profiles, error: profilesError } = userIds.length
        ? await adminClient
            .from("wpi_profiles")
            .select("id, display_name, avatar_url, phone, locale")
            .in("id", userIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const authUsers = [];
      for (let page = 1; page <= 10; page += 1) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        authUsers.push(...data.users);
        if (data.users.length < 1000) break;
      }

      const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
      const authMap = new Map(authUsers.map((user) => [user.id, user]));
      const normalized = (members ?? []).map((member) => {
        const userId = String(member.user_id);
        const profile = profileMap.get(userId);
        const user = authMap.get(userId);
        return {
          userId,
          displayName: profile?.display_name ?? user?.email?.split("@")[0] ?? "未命名成员",
          avatarUrl: profile?.avatar_url ?? null,
          phone: profile?.phone ?? null,
          locale: profile?.locale ?? "zh-CN",
          email: user?.email ?? null,
          role: member.role,
          isActive: member.is_active,
          joinedAt: member.joined_at,
          updatedAt: member.updated_at,
          emailConfirmedAt: user?.email_confirmed_at ?? null,
          lastSignInAt: user?.last_sign_in_at ?? null,
          isCurrentUser: userId === currentUserId,
        };
      });

      return json({
        data: normalized,
        organization: organization ?? null,
        currentUserId,
        currentRole,
        roles,
        permissions: { canView: true, canInvite: true, canUpdate: true },
      });
    }

    if (action === "activity") {
      if (!body.userId) return json({ error: "缺少用户 ID" }, 400);
      const { data, error } = await adminClient
        .from("wpi_audit_logs")
        .select("id, action, table_name, record_id, old_data, new_data, created_at")
        .eq("organization_id", organizationId)
        .eq("record_id", body.userId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return json({ data: data ?? [] });
    }

    if (action === "invite") {
      const email = body.email?.trim().toLowerCase();
      const displayName = body.displayName?.trim() || email?.split("@")[0] || "新成员";
      const role = body.role && roles.includes(body.role) ? body.role : "viewer";
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return json({ error: "请输入有效邮箱" }, 400);
      }

      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName },
        redirectTo: body.redirectTo,
      });
      if (inviteError || !inviteData.user) {
        return json({ error: inviteError?.message ?? "邀请失败" }, 400);
      }

      const invitedUserId = inviteData.user.id;
      const { error: profileError } = await adminClient
        .from("wpi_profiles")
        .upsert({ id: invitedUserId, display_name: displayName, phone: body.phone?.trim() || null }, { onConflict: "id" });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(invitedUserId);
        throw profileError;
      }

      // Use the caller-scoped client so RLS authorizes the change and the audit
      // trigger records the real administrator as actor_id.
      const { error: memberError } = await userClient.from("wpi_organization_members").insert({
        organization_id: organizationId,
        user_id: invitedUserId,
        role,
        is_active: true,
      });
      if (memberError) {
        await adminClient.auth.admin.deleteUser(invitedUserId);
        throw memberError;
      }

      return json({ ok: true, userId: invitedUserId, email, role }, 201);
    }

    if (action === "update") {
      if (!body.userId) return json({ error: "缺少用户 ID" }, 400);
      const { data: target, error: targetError } = await adminClient
        .from("wpi_organization_members")
        .select("user_id, role, is_active")
        .eq("organization_id", organizationId)
        .eq("user_id", body.userId)
        .maybeSingle();
      if (targetError || !target) return json({ error: "成员不存在" }, 404);

      const nextRole = body.role && roles.includes(body.role) ? body.role : (target.role as AppRole);
      const nextActive = typeof body.isActive === "boolean" ? body.isActive : Boolean(target.is_active);
      if (body.userId === currentUserId && (nextRole !== "admin" || !nextActive)) {
        return json({ error: "不能停用或降级当前登录管理员" }, 409);
      }

      if (target.role === "admin" && (nextRole !== "admin" || !nextActive)) {
        const { count, error: countError } = await adminClient
          .from("wpi_organization_members")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("role", "admin")
          .eq("is_active", true);
        if (countError) throw countError;
        if ((count ?? 0) <= 1) return json({ error: "组织必须保留至少一名启用中的管理员" }, 409);
      }

      const { error: updateError } = await userClient
        .from("wpi_organization_members")
        .update({ role: nextRole, is_active: nextActive })
        .eq("organization_id", organizationId)
        .eq("user_id", body.userId);
      if (updateError) throw updateError;

      if (body.displayName !== undefined || body.phone !== undefined) {
        const profileUpdate: Record<string, string | null> = {};
        if (body.displayName !== undefined) profileUpdate.display_name = body.displayName.trim() || null;
        if (body.phone !== undefined) profileUpdate.phone = body.phone.trim() || null;
        const { error: profileError } = await adminClient
          .from("wpi_profiles")
          .update(profileUpdate)
          .eq("id", body.userId);
        if (profileError) throw profileError;
      }

      return json({ ok: true });
    }

    if (action === "reset_password") {
      if (!body.userId || !body.redirectTo) return json({ error: "缺少用户或回调地址" }, 400);
      const { data, error } = await adminClient.auth.admin.getUserById(body.userId);
      if (error || !data.user?.email) return json({ error: "未找到用户邮箱" }, 404);
      const mailClient = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: resetError } = await mailClient.auth.resetPasswordForEmail(data.user.email, {
        redirectTo: body.redirectTo,
      });
      if (resetError) throw resetError;
      return json({ ok: true });
    }

    return json({ error: "不支持的操作" }, 400);
  } catch (error) {
    console.error("wpi-user-management", error);
    return json({ error: message(error) }, 500);
  }
});
