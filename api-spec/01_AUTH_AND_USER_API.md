# 01 登录、用户与权限 API 草案

## 1. 登录

```http
POST /api/auth/login
```

### Request

```json
{
  "username": "admin",
  "password": "password"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "mock-token",
    "user": {
      "id": "user_001",
      "name": "管理员",
      "role": "admin"
    }
  }
}
```

## 2. 获取当前用户

```http
GET /api/auth/me
```

## 3. 用户列表

```http
GET /api/users
```

## 4. 创建用户

```http
POST /api/users
```

## 5. 更新用户

```http
PATCH /api/users/{id}
```

## 6. 角色与权限

```http
GET /api/roles
GET /api/permissions
PATCH /api/roles/{id}/permissions
```

## 7. 权限角色建议

| 角色 | 说明 |
|---|---|
| admin | 系统管理员 |
| commercial_manager | 商务经理 |
| procurement | 采购人员 |
| engineer | 机电工程师 |
| cost_engineer | 成本测算 |
| viewer | 领导只读 |
