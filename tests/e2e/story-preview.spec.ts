import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { expect, test } from "./fixtures";

/** Offline editorial artifact, never deployed to the public site. */
test.describe("MUNDI V10 — preview interne du premier récit",()=>{
  test.beforeEach(async ({ page }, info)=>{
    const destination=info.outputPath("story-preview.html");
    execFileSync(process.execPath,["scripts/build-story-preview.mjs"],{
      encoding:"utf8",
      env:{...process.env,MUNDI_STORY_OUT:destination},
    });
    await page.goto(pathToFileURL(destination).href);
  });

  test("four source-linked scenes, explicitly marked not published",async ({page})=>{
    await expect(page.locator(".scene")).toHaveCount(4);
    await expect(page.getByText("Brouillon · non publié")).toBeVisible();
    await expect(page.locator(".denominator")).toContainText("parmi les déchets textiles traités");
    await expect(page.locator(".comparison-item")).toHaveCount(2);
    await expect(page.locator(".scene .source a")).toHaveCount(4);
    await expect(page.locator(".scene .source a").first()).toHaveAttribute("href",/ec\.europa\.eu\/eurostat/);
    await expect(page.locator(".scene .source a").last()).toHaveAttribute("href",/environment\.ec\.europa\.eu/);
  });

  test("navigation moves to the next scene and keeps the progress indicator accurate",async ({page})=>{
    const target=page.getByRole("button",{name:"Aller à l’écran 2 sur 4"});
    await target.click();
    await expect(target).toHaveAttribute("aria-current","step");
    await expect(page.locator(".scene").nth(1)).toBeInViewport({ratio:0.7});
  });

  test("reading mode and pause can be toggled without hiding the content",async ({page})=>{
    const reading=page.locator("#reading");
    const pause=page.locator("#pause");
    await reading.click();
    await expect(reading).toHaveAttribute("aria-pressed","true");
    await expect(page.locator("body")).toHaveClass(/reading/);
    await expect(page.locator(".scene").first().getByRole("heading")).toBeVisible();
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed","true");
    await expect(page.locator("body")).toHaveClass(/paused/);
    await reading.click();
    await expect(reading).toHaveAttribute("aria-pressed","false");
  });

  test("small screens are free from horizontal page overflow; reduced motion works",async ({page})=>{
    await page.setViewportSize({width:360,height:740});
    await page.emulateMedia({reducedMotion:"reduce"});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <=window.innerWidth+1)).toBe(true);
    const animation=await page.locator(".scene__texture").first().evaluate(el=>getComputedStyle(el).animationName);
    expect(animation).toBe("none");
  });
});
