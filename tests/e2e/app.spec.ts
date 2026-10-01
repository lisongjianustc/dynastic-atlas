import { expect, test, type Page } from '@playwright/test';

/**
 * 端到端。
 *
 * 无头 SwiftShader 下地图初始化要 10 秒上下，所以**不用 sleep 猜**，
 * 而是轮询 `window.__atlasMap.loaded()` —— 这是应用留给调试的那个把手。
 * 早先截图拍出全黑，就是因为没等这一步。
 */

async function waitForMap(page: Page) {
  await page.waitForFunction(
    () => {
      const m = (window as unknown as { __atlasMap?: { loaded: () => boolean } }).__atlasMap;
      return !!m && m.loaded();
    },
    null,
    { timeout: 60_000 },
  );
}

/** 打开某个年份并等地图像就绪 */
async function openAt(page: Page, search = '') {
  await page.goto(`/${search}`);
  await expect(page.getByTestId('year')).toBeVisible();
  await waitForMap(page);
}

test.describe('应用启动', () => {
  test('加载后有年份、时间轴与地图，且没有控制台报错', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await openAt(page);

    await expect(page.getByTestId('year')).toHaveText('220年');
    await expect(page.getByTestId('tl-year')).toHaveText('220年');

    // 游标容器自身没有尺寸（子元素绝对定位），所以断言它随年份移动，而不是断言可见
    const cursorAt = () =>
      page.getByTestId('tl-cursor').evaluate((el) => (el as HTMLElement).style.left);
    const before = await cursorAt();
    await page.getByTitle('进 10 年（Shift+→）').click();
    expect(await cursorAt()).not.toBe(before);

    // 地图上真的画出了疆域面，而不是一张空白底图
    const features = await page.evaluate(() => {
      const m = (window as unknown as { __atlasMap: { querySourceFeatures: (s: string) => unknown[] } }).__atlasMap;
      return m.querySourceFeatures('territories').length;
    });
    expect(features).toBeGreaterThan(0);

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('深链 ?y= 直接落在指定年份', async ({ page }) => {
    await openAt(page, '?y=750');
    await expect(page.getByTestId('year')).toHaveText('750年');
    await expect(page.getByTestId('tl-year')).toHaveText('750年');
  });

  test('顶点数随年份变化 —— 说明状态机真的在换数据', async ({ page }) => {
    await openAt(page, '?y=410');
    const at410 = await page.getByTestId('polity-count').textContent();
    await page.goto('/?y=230');
    await waitForMap(page);
    const at230 = await page.getByTestId('polity-count').textContent();
    expect(at410).not.toBe(at230);
  });
});

test.describe('时间轴导航', () => {
  test('顶栏按钮逐年步进', async ({ page }) => {
    await openAt(page, '?y=750');
    await page.getByTitle('进 1 年（→）').click();
    await expect(page.getByTestId('year')).toHaveText('751年');
    await page.getByTitle('退 10 年（Shift+←）').click();
    await expect(page.getByTestId('year')).toHaveText('741年');
  });

  test('键盘左右键步进', async ({ page }) => {
    await openAt(page, '?y=410');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('year')).toHaveText('411年');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('year')).toHaveText('409年');
  });

  test('年份被夹在视野之内，不会越界', async ({ page }) => {
    await openAt(page, '?y=959');
    await page.getByTitle('进 10 年（Shift+→）').click();
    await expect(page.getByTestId('year')).toHaveText('959年');
  });

  test('跳到下一个纪事年份', async ({ page }) => {
    await openAt(page, '?y=410');
    await page.getByTitle('下一个有纪事的年份').click();
    const y = await page.getByTestId('year').textContent();
    expect(Number(y!.replace(/\D/g, ''))).toBeGreaterThan(410);
  });
});

test.describe('事件：只在当年显示，点开有出处', () => {
  test('事件 chip 只属于当前年份', async ({ page }) => {
    await openAt(page, '?y=410');
    const chips = page.getByTestId('event-chip');
    // 410 年这一带有纪事，chip 数应当有限（不是把 82 个事件全铺开）
    const count = await chips.count();
    expect(count).toBeLessThan(6);

    // 走到一个没有纪事的年份，chip 应当消失
    await page.goto('/?y=411');
    await waitForMap(page);
    await expect(page.getByTestId('tl-no-events')).toBeVisible();
  });

  test('点开事件会打开详情面板，并显示审查状态', async ({ page }) => {
    await openAt(page, '?y=868&evt=E108');
    const panel = page.getByTestId('side-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('咸通九年');
    await expect(panel).toContainText('出处');
    await expect(panel).toContainText('The Diamond Sutra');
    // 未核验就必须说未核验
    await expect(panel).toContainText('pending');
  });

  test('事件 URL 深链能还原选中状态', async ({ page }) => {
    await openAt(page, '?y=383&evt=E018');
    await expect(page.getByTestId('side-panel')).toBeVisible();
  });
});

test.describe('控制层级图例', () => {
  test('默认显示图例，可切到资料覆盖再切回', async ({ page }) => {
    await openAt(page, '?y=410');
    await expect(page.getByText('控制强度')).toBeVisible();

    await page.getByTestId('tab-coverage').click();
    await expect(page.getByRole('heading', { name: '资料覆盖' })).toBeVisible();
    await expect(page.getByText(/空白表示尚缺资料/)).toBeVisible();

    await page.getByTestId('tab-legend').click();
    await expect(page.getByText('控制强度')).toBeVisible();
  });

  test('?pv=coverage 直接打开资料覆盖', async ({ page }) => {
    await openAt(page, '?y=410&pv=coverage');
    await expect(page.getByText(/空白表示尚缺资料/)).toBeVisible();
    await expect(page.getByText(/涉及缺口/)).toBeVisible();
  });
});

test.describe('资料来源的诚实性', () => {
  test('资料覆盖面板如实报出 0 条已核验', async ({ page }) => {
    await openAt(page, '?y=750&pv=coverage');
    await expect(page.getByText(/全部待审/)).toBeVisible();
    await expect(page.getByText('未经历史专业审定', { exact: true })).toBeVisible();
  });

  test('说明哪些部分用了真实地理参照', async ({ page }) => {
    await openAt(page, '?y=750');
    await expect(page.getByText(/本图边界为示意/)).toBeVisible();
  });
});

test.describe('地图图层', () => {
  // 控制层级不是靠图层 filter 隐藏的，而是靠 fill-opacity 里的 match 表达式置 0。
  // 所以断言要看真正生效的绘制属性 —— 这条覆盖了「点图例 → store → setPaintProperty」整条链路。
  const fillOpacity = (page: Page) =>
    page.evaluate(() => {
      const m = (window as unknown as {
        __atlasMap: { getPaintProperty: (l: string, p: string) => unknown };
      }).__atlasMap;
      return JSON.stringify(m.getPaintProperty('terr-fill', 'fill-opacity'));
    });

  test('关掉某个控制层级会真的改变绘制不透明度', async ({ page }) => {
    await openAt(page, '?y=750');
    const before = await fillOpacity(page);
    expect(before).toContain('"military",1');

    await page.getByRole('button', { name: /军事控制/ }).click();
    await page.waitForTimeout(600);

    const after = await fillOpacity(page);
    expect(after).not.toBe(before);
    expect(after).toContain('"military",0');
  });

  test('关掉后重点回来会恢复', async ({ page }) => {
    await openAt(page, '?y=750');
    const btn = page.getByRole('button', { name: /军事控制/ });
    await btn.click();
    await page.waitForTimeout(400);
    await btn.click();
    await page.waitForTimeout(400);
    expect(await fillOpacity(page)).toContain('"military",1');
  });

  test('事件点只属于当前年份', async ({ page }) => {
    await openAt(page, '?y=410');
    const at410 = await page.evaluate(() => {
      const m = (window as unknown as {
        __atlasMap: { queryRenderedFeatures: (o: { layers: string[] }) => { properties: Record<string, unknown> }[] };
      }).__atlasMap;
      return m.queryRenderedFeatures({ layers: ['event-dot'] }).map((f) => f.properties.y);
    });
    // 每个渲染出来的事件点，年份都必须是当前年 —— 这条是「不是把全部事件都铺在图上」的机械证据
    for (const y of at410) expect(y).toBe(410);
  });
});
