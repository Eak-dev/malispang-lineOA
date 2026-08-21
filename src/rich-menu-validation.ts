export interface RichMenuBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RichMenuArea {
  readonly id: string;
  readonly bounds: RichMenuBounds;
  readonly action: {
    readonly type: "text" | "uri" | "none";
    readonly data?: string;
    readonly text?: string;
    readonly uri?: string | null;
    readonly enabled: boolean;
  };
}

export interface RichMenuActionMap {
  readonly account: string;
  readonly chatBarLabel: string;
  readonly defaultDisplay: "shown" | "hidden";
  readonly imagePath: string;
  readonly image: { readonly width: number; readonly height: number };
  readonly publishable: boolean;
  readonly areas: readonly RichMenuArea[];
}

export interface RichMenuValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateRichMenuActionMap(
  value: RichMenuActionMap,
): RichMenuValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (value.image.width !== 2500 || value.image.height !== 1686) {
    errors.push("rich menu image must be 2500x1686");
  }
  if (value.account !== "มะลิปัง TEST") {
    errors.push("rich menu account must be มะลิปัง TEST");
  }
  if (value.chatBarLabel !== "รู้จักมะลิปัง") {
    errors.push("unexpected rich menu chat bar label");
  }
  if (value.defaultDisplay !== "shown") {
    errors.push("rich menu must be shown by default");
  }
  if (value.areas.length !== 6) {
    errors.push("original rich menu must contain six grid areas");
  }

  for (const [index, area] of value.areas.entries()) {
    if (ids.has(area.id)) errors.push(`area ${index} has a duplicate id`);
    ids.add(area.id);

    const { x, y, width, height } = area.bounds;
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      errors.push(`area ${area.id} has invalid bounds`);
    }
    if (x + width > value.image.width || y + height > value.image.height) {
      errors.push(`area ${area.id} exceeds image bounds`);
    }
    if (area.action.type === "text") {
      if (
        !["สะสมแต้มและโปรโมชั่น", "Delivery", "เมนูขนมปัง"].includes(
          area.action.text ?? "",
        ) ||
        area.action.data
      ) {
        errors.push(`area ${area.id} has an unsafe text action`);
      }
    }
    if (
      area.action.type === "uri" &&
      area.action.enabled &&
      ![
        "https://maps.app.goo.gl/mLTyUC1891a4uu7D9?g_st=ic",
        "https://www.facebook.com/share/18jLnt8dVY/?mibextid=wwXIfr",
      ].includes(area.action.uri ?? "")
    ) {
      errors.push(`area ${area.id} has an unsafe URI`);
    }
    if (
      area.action.type === "none" &&
      (area.action.enabled ||
        area.action.data ||
        area.action.text ||
        area.action.uri)
    ) {
      errors.push(`area ${area.id} has an invalid no-action configuration`);
    }
  }

  const coveredPixels = value.areas.reduce(
    (total, area) => total + area.bounds.width * area.bounds.height,
    0,
  );
  if (coveredPixels !== value.image.width * value.image.height) {
    errors.push("rich menu areas must cover the full image without gaps");
  }

  for (let left = 0; left < value.areas.length; left += 1) {
    for (let right = left + 1; right < value.areas.length; right += 1) {
      const a = value.areas[left];
      const b = value.areas[right];
      if (a && b && overlaps(a.bounds, b.bounds)) {
        errors.push(`areas ${a.id} and ${b.id} overlap`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function overlaps(a: RichMenuBounds, b: RichMenuBounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
