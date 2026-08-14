export type ConversationMode = "BOT_ACTIVE" | "HUMAN_HANDOFF";

export type CustomerAction =
  | "OPEN_FLEX_MENU"
  | "SHOW_MENU"
  | "MENU_PRICE"
  | "CHECK_TODAY"
  | "ADVANCE_ORDER"
  | "REWARDS_INFO"
  | "LOCATION"
  | "OPENING_HOURS"
  | "WHOLESALE"
  | "HUMAN_HANDOFF";

export interface CustomerEvent {
  readonly kind: "customer";
  readonly eventId: string;
  readonly conversationId: string;
  readonly content:
    | { readonly kind: "text"; readonly text: string }
    | { readonly kind: "action"; readonly action: CustomerAction }
    | { readonly kind: "payment_slip"; readonly mockAssetId: string };
}

export interface StaffCloseEvent {
  readonly kind: "staff_close";
  readonly eventId: string;
  readonly conversationId: string;
  readonly staffId: string;
}

export type MockEvent = CustomerEvent | StaffCloseEvent;

export interface ConversationState {
  mode: ConversationMode;
  handoffWindow: number;
  handoffAcknowledged: boolean;
  closedBy?: string;
}

export interface ReplyEnvelope {
  readonly replyKey: string;
  readonly conversationId: string;
  readonly message: ReplyMessage;
}

export type ReplyMessage =
  | { readonly type: "text"; readonly text: string }
  | {
      readonly type: "flex";
      readonly altText: string;
      readonly contents: FlexBubble;
    };

export interface FlexBubble {
  readonly type: "bubble";
  readonly size: "mega";
  readonly header: FlexBox;
  readonly body: FlexBox;
  readonly footer: FlexBox;
}

export interface FlexBox {
  readonly type: "box";
  readonly layout: "vertical";
  readonly backgroundColor?: string;
  readonly paddingAll?: string;
  readonly spacing?: string;
  readonly contents: readonly FlexComponent[];
}

export type FlexComponent =
  | {
      readonly type: "text";
      readonly text: string;
      readonly color?: string;
      readonly size?: string;
      readonly weight?: "bold" | "regular";
      readonly wrap?: boolean;
      readonly align?: "start" | "center";
    }
  | {
      readonly type: "button";
      readonly style: "primary" | "secondary";
      readonly color: string;
      readonly height: "sm";
      readonly action: {
        readonly type: "postback";
        readonly label: string;
        readonly data: string;
        readonly displayText: string;
      };
    };
