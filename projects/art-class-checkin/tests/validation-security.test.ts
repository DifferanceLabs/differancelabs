import { describe, expect, it } from "vitest";
import { changes } from "../server/validation";

describe("bounded class roster validation", () => {
  it("rejects an oversized roster before collecting one error per invalid child", () => {
    const result = changes["class.save"].safeParse({
      data: {
        name: "Fictional class",
        instructor: "Test instructor",
        studentIds: Array(10000).fill("invalid-id"),
        archived: false,
      },
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Oversized roster was accepted");
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0].code).toBe("too_big");
    expect(result.error.issues[0].path).toEqual(["data", "studentIds"]);
  });
});
