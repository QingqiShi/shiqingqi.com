import { afterEach, describe, expect, it } from "vitest";
import { getTabbableElements } from "./get-tabbable-elements.ts";

function tabbableIds(html: string) {
  document.body.innerHTML = html;
  return getTabbableElements(document.body).map((element) => element.id);
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getTabbableElements", () => {
  it("finds the elements the spec makes focusable without a tabindex", () => {
    expect(
      tabbableIds(`
        <a id="link" href="#x">link</a>
        <button id="button">button</button>
        <input id="input" />
        <select id="select"><option>one</option></select>
        <textarea id="textarea"></textarea>
        <iframe id="iframe" title="frame"></iframe>
      `),
    ).toEqual(["link", "button", "input", "select", "textarea", "iframe"]);
  });

  it("takes the first summary of a details, and no other summary", () => {
    expect(
      tabbableIds(`
        <details open>
          <summary id="first">first</summary>
          <summary id="second">second</summary>
        </details>
        <summary id="orphan">orphan</summary>
      `),
    ).toEqual(["first"]);
  });

  it('takes an editing host but not contenteditable="false"', () => {
    expect(
      tabbableIds(`
        <div id="editable" contenteditable></div>
        <div id="plaintext" contenteditable="plaintext-only"></div>
        <div id="frozen" contenteditable="false"></div>
      `),
    ).toEqual(["editable", "plaintext"]);
  });

  it("takes media elements only while they show controls", () => {
    expect(
      tabbableIds(`
        <audio id="audio" controls></audio>
        <video id="video" controls></video>
        <audio id="bareAudio"></audio>
        <video id="bareVideo"></video>
      `),
    ).toEqual(["audio", "video"]);
  });

  it("takes links and areas only when they have an href", () => {
    expect(
      tabbableIds(`
        <a id="link" href="#x">link</a>
        <a id="anchor">anchor</a>
        <img src="/wall.png" alt="wall" usemap="#shown" />
        <map name="shown">
          <area id="area" href="#x" shape="rect" coords="0,0,1,1" alt="area" />
          <area id="bareArea" shape="rect" coords="0,0,1,1" alt="bare" />
        </map>
      `),
    ).toEqual(["link", "area"]);
  });

  it("leaves out an area whose map no image uses", () => {
    expect(
      tabbableIds(`
        <a id="link" href="#x">link</a>
        <map name="unused">
          <area id="area" href="#x" shape="rect" coords="0,0,1,1" alt="area" />
        </map>
      `),
    ).toEqual(["link"]);
  });

  it("leaves out a hidden input", () => {
    expect(
      tabbableIds(`
        <input id="text" type="text" />
        <input id="hidden" type="hidden" />
      `),
    ).toEqual(["text"]);
  });

  it("reads the tabindex attribute rather than the tabIndex property", () => {
    expect(
      tabbableIds(`
        <div id="zero" tabindex="0"></div>
        <div id="negative" tabindex="-1"></div>
        <div id="unparsable" tabindex="banana"></div>
        <div id="hex" tabindex="0x10"></div>
        <div id="plain"></div>
        <button id="skipped" tabindex="-1">skipped</button>
      `),
    ).toEqual(["zero", "unparsable", "hex"]);
  });

  it("leaves out a disabled control", () => {
    expect(
      tabbableIds(`
        <button id="enabled">enabled</button>
        <button id="disabled" disabled>disabled</button>
        <input id="disabledInput" disabled />
      `),
    ).toEqual(["enabled"]);
  });

  it("leaves out controls a fieldset disables, keeping its first legend", () => {
    expect(
      tabbableIds(`
        <fieldset disabled>
          <legend><button id="inFirstLegend">first legend</button></legend>
          <legend><button id="inSecondLegend">second legend</button></legend>
          <button id="inFieldset">in fieldset</button>
          <fieldset>
            <button id="inNestedFieldset">in nested fieldset</button>
          </fieldset>
        </fieldset>
      `),
    ).toEqual(["inFirstLegend"]);
  });

  it("leaves out an inert subtree", () => {
    expect(
      tabbableIds(`
        <button id="live">live</button>
        <div inert>
          <button id="inInert">in inert</button>
        </div>
        <button id="inertSelf" inert>inert itself</button>
      `),
    ).toEqual(["live"]);
  });

  it("leaves out the hidden attribute", () => {
    expect(
      tabbableIds(`
        <button id="shown">shown</button>
        <button id="hiddenSelf" hidden>hidden itself</button>
        <div hidden><button id="inHidden">in hidden</button></div>
      `),
    ).toEqual(["shown"]);
  });

  it("leaves out display: none, including on an ancestor", () => {
    expect(
      tabbableIds(`
        <button id="shown">shown</button>
        <button id="noneSelf" style="display: none">none itself</button>
        <div style="display: none"><button id="inNone">in none</button></div>
      `),
    ).toEqual(["shown"]);
  });

  it("leaves out visibility: hidden", () => {
    expect(
      tabbableIds(`
        <button id="shown">shown</button>
        <div style="visibility: hidden"><button id="inHidden">in hidden</button></div>
      `),
    ).toEqual(["shown"]);
  });

  it("leaves out the content of a closed details but keeps its summary", () => {
    expect(
      tabbableIds(`
        <details>
          <summary id="closedSummary">closed</summary>
          <button id="inClosed">in closed</button>
        </details>
        <details open>
          <summary id="openSummary">open</summary>
          <button id="inOpen">in open</button>
        </details>
      `),
    ).toEqual(["closedSummary", "openSummary", "inOpen"]);
  });

  it("gives a radio group one stop, at the checked radio", () => {
    expect(
      tabbableIds(`
        <input id="one" type="radio" name="pick" />
        <input id="two" type="radio" name="pick" checked />
        <input id="three" type="radio" name="pick" />
      `),
    ).toEqual(["two"]);
  });

  it("gives an unchecked radio group its stop at the first radio", () => {
    expect(
      tabbableIds(`
        <input id="one" type="radio" name="pick" />
        <input id="two" type="radio" name="pick" />
      `),
    ).toEqual(["one"]);
  });

  it("keeps radio groups apart by name and by form owner", () => {
    expect(
      tabbableIds(`
        <input id="pickOne" type="radio" name="pick" />
        <input id="pickTwo" type="radio" name="pick" />
        <input id="otherOne" type="radio" name="other" />
        <form id="form">
          <input id="formOne" type="radio" name="pick" />
          <input id="formTwo" type="radio" name="pick" checked />
        </form>
        <input id="nameless" type="radio" />
        <input id="nameless2" type="radio" />
      `),
    ).toEqual(["pickOne", "otherOne", "formTwo", "nameless", "nameless2"]);
  });

  it("puts a positive tabindex first, lowest value first, then tree order", () => {
    expect(
      tabbableIds(`
        <button id="documentFirst">document first</button>
        <div id="third" tabindex="3"></div>
        <div id="firstA" tabindex="1"></div>
        <div id="firstB" tabindex="1"></div>
        <button id="documentSecond" tabindex="0">document second</button>
      `),
    ).toEqual(["firstA", "firstB", "third", "documentFirst", "documentSecond"]);
  });
});
