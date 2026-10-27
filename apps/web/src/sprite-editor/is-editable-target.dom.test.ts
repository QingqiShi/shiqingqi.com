import { describe, expect, it } from "vitest";
import { isEditableTarget } from "./is-editable-target";

describe("isEditableTarget", () => {
  it("returns true for text, number, range, and color inputs", () => {
    for (const type of ["text", "number", "range", "color", "search"]) {
      const input = document.createElement("input");
      input.type = type;
      expect(isEditableTarget(input)).toBe(true);
    }
  });

  it("returns true for textarea and select", () => {
    expect(isEditableTarget(document.createElement("textarea"))).toBe(true);
    expect(isEditableTarget(document.createElement("select"))).toBe(true);
  });

  it("returns true for contenteditable elements and their children", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    div.appendChild(child);
    document.body.appendChild(div);
    try {
      expect(isEditableTarget(div)).toBe(true);
      expect(isEditableTarget(child)).toBe(true);
    } finally {
      div.remove();
    }
  });

  it("returns true for every editing host state and their descendants", () => {
    for (const value of ["", "true", "TRUE", "plaintext-only"]) {
      document.body.innerHTML = `
        <div id="host" contenteditable="${value}">
          <p><strong><span id="descendant">deep</span></strong></p>
        </div>
      `;
      expect(isEditableTarget(document.getElementById("host"))).toBe(true);
      expect(isEditableTarget(document.getElementById("descendant"))).toBe(
        true,
      );
    }
    document.body.innerHTML = "";
  });

  it('returns false inside a contenteditable="false" island', () => {
    document.body.innerHTML = `
      <div contenteditable="plaintext-only">
        <div id="island" contenteditable="false">
          <span id="inIsland">frozen</span>
        </div>
      </div>
    `;
    expect(isEditableTarget(document.getElementById("island"))).toBe(false);
    expect(isEditableTarget(document.getElementById("inIsland"))).toBe(false);
    document.body.innerHTML = "";
  });

  it("returns true for any element while the document is in design mode", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    document.designMode = "on";
    try {
      expect(isEditableTarget(div)).toBe(true);
    } finally {
      document.designMode = "off";
      div.remove();
    }
  });

  it("returns false for non-editable elements", () => {
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
    expect(isEditableTarget(document.createElement("canvas"))).toBe(false);
    expect(isEditableTarget(document.createElement("div"))).toBe(false);
    expect(isEditableTarget(document.body)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});
