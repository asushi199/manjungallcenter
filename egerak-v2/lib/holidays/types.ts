export type HolidayKind = "umum" | "sekolah";

export type HolidayDetail = {
  kind: HolidayKind;
  name: string;
  note?: string;
};

export type HolidayRange = {
  start: string;
  end: string;
  name: string;
  note?: string;
};
