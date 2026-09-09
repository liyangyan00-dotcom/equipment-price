export type TopbarAiMode = "human_review" | "assisted";

export type TopbarNotificationCategory =
  | "system"
  | "review"
  | "risk"
  | "ai"
  | "inquiry"
  | "report";

export type TopbarNotification = {
  id: string;
  category: TopbarNotificationCategory;
  title: string;
  message: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export type TopbarContext = {
  navigationCounts?: import("@/config/navigation").NavigationCounts;
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
  organization: {
    id: string;
    name: string;
  };
  preferences: {
    aiMode: TopbarAiMode;
    notificationsEnabled: boolean;
  };
  notifications: TopbarNotification[];
  unreadCount: number;
};

export type GlobalSearchResult = {
  id: string;
  type: "equipment" | "material" | "supplier" | "inquiry" | "project" | "report" | "ai_task";
  title: string;
  subtitle: string;
  href: string;
};
