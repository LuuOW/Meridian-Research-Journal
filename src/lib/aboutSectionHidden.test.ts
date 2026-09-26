import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("About Section Hidden Completely Suite", () => {
  const navbarPath = path.join(process.cwd(), "src", "components", "Navbar.tsx");
  const appPath = path.join(process.cwd(), "src", "App.tsx");

  test("Navbar.tsx does not render any About links in desktop navigation", () => {
    const navbarSrc = fs.readFileSync(navbarPath, "utf-8");
    
    // Check navigation links block
    const navLinksMatch = navbarSrc.match(/\{\/\* Navigation Links \*\/\}([\s\S]*?)\{\/\* Action Button/);
    assert.ok(navLinksMatch, "Navigation links block must exist");
    
    const navContent = navLinksMatch[1];
    assert.ok(!navContent.includes(">About<"), "Desktop nav links must not contain >About<");
    assert.ok(!navContent.includes("onClick={onOpenAbout}"), "Desktop nav must not link to onOpenAbout");
  });

  test("Navbar.tsx does not render any mobile About button", () => {
    const navbarSrc = fs.readFileSync(navbarPath, "utf-8");
    
    assert.ok(!navbarSrc.includes("title=\"About Meridian Journal\""), "Mobile About button must not exist");
    assert.ok(!navbarSrc.includes("Mobile About Button"), "Mobile About Button must be removed");
  });

  test("App.tsx does not display the AboutModal overlay", () => {
    const appSrc = fs.readFileSync(appPath, "utf-8");
    
    // Must not pass onOpenAbout to Navbar
    assert.ok(!appSrc.includes("onOpenAbout="), "App.tsx must not pass onOpenAbout to Navbar");
    
    // AboutModal must not be active in the render tree
    const aboutRenderActive = /<AboutModal\s+isOpen=\{isAboutOpen\}/.test(appSrc);
    assert.strictEqual(aboutRenderActive, false, "AboutModal must not be active with isAboutOpen");
  });
});
