import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { migrateState } from '../dist/src/state/migration.js';

// Synthetic fixtures and literal arithmetic oracles. This verifies the UI and
// its declared policy; it is not an observation of Balatro or an optimality test.
const dir = 'docs/evidencia/tienda';
const port = '4187';
const storageKey = 'balatro-advisor.confirmed.v1';
await mkdir(dir, { recursive: true });
const report = {
  date: new Date().toISOString(), environment: 'Chrome headless; desktop/mobile emulation',
  gameObservation: false, optimalityClaim: false, cases: [],
};
const pass = (id, expected, observed) => report.cases.push({ id, expected, observed, status: 'passed' });
const base = JSON.parse(await readFile('examples/shop-purchase.json', 'utf8'));
const known = value => ({ status: 'known', source: 'manual', value });
function fixture({ vouchers = [], jokers = [] } = {}) {
  // This synthetic current-format scenario opts into migration explicitly.
  // Legacy loading and refusal to silently migrate remain covered elsewhere.
  const migrated = migrateState(structuredClone(base));
  assert.equal(migrated.ok, true, 'The synthetic shop fixture must migrate to0.2.');
  const state = migrated.value;
  state.runId = 'synthetic-shop-ui';
  state.observed.money = known(25);
  state.observed.jokers = known(jokers);
  state.observed.shop = known({ shopId: 'synthetic-visible-shop', cardOffers: [], ignoredOtherOffers: [] });
  state.observed.outOfScope = known({ vouchers, consumables: [], pendingTags: [], otherModifiers: [] });
  state.assumptions.probes = [];
  state.assumptions.roundPlans = [];
  return state;
}
const ownedJoker = (catalogId, instanceId = 'owned-compatible') => ({
  instanceId, catalogId, edition: known('base'), stickers: known([]), sellValue: known(1), counters: {},
});
const server = spawn(process.execPath, ['dist/src/server.js'], {
  env: { ...process.env, PORT: port }, stdio: 'pipe', windowsHide: true,
});
let serverError = '';
server.stderr.on('data', data => { serverError += String(data); });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Shop test server did not start: ' + serverError)), 15000);
    server.stdout.on('data', data => {
      if (String(data).includes('Balatro Advisor local')) { clearTimeout(timeout); resolve(); }
    });
    server.on('error', error => { clearTimeout(timeout); reject(error); });
    server.on('exit', () => { clearTimeout(timeout); reject(Error('Shop test server stopped: ' + serverError)); });
  });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const errors = [];
  async function session(state) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Count every confirmed-record write, including identical rewrites, after import.
    await context.addInitScript(key => {
      window.__shopConfirmedWrites = 0;
      window.__shopStateSubmits = 0;
      document.addEventListener('submit', event => {
        if (event.target.matches('#state-form form')) window.__shopStateSubmits++;
      }, true);
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key) window.__shopConfirmedWrites++;
        return original.call(this, name, value);
      };
    }, storageKey);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const go = screen => page.locator(`[data-screen="${screen}"]`).click();
    const stored = () => page.evaluate(key => localStorage.getItem(key), storageKey);
    const writes = () => page.evaluate(() => window.__shopConfirmedWrites);
    const submits = () => page.evaluate(() => window.__shopStateSubmits);
    await page.goto('http://127.0.0.1:' + port + '/');
    await page.waitForFunction(() => document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
    await go('archive');
    await page.locator('#import-file').setInputFiles({
      name: 'synthetic-shop.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state)),
    });
    await page.locator('#dialog-accept').click();
    await go('table');
    await page.waitForFunction(() => document.querySelectorAll('.bay-mini').length === 150);
    const original = await stored();
    let expectedRecord = original, writeCount = await writes(), submitCount = await submits();
    // Transcribing an observed joker or voucher is a persisted correction. Checkpoints
    // are explicit and only taken after edits, never after an advice operation.
    const checkpoint = async () => { expectedRecord = await stored(); writeCount = await writes(); submitCount = await submits(); };
    const inventory = () => page.locator('.inventory-panel .joker-editor select[id^="joker-"]').evaluateAll(rows => rows.map(row => row.value));
    const originalInventory = await inventory();
    const voucherInventory = () => page.locator('#vouchers [data-owned="true"]').evaluateAll(rows => rows.map(row => row.dataset.voucher));
    const originalVouchers = await voucherInventory();
    const unchanged = async () => {
      assert.equal(await stored(), expectedRecord, 'Shop consultation must preserve the exact confirmed record since the last observed edit.');
      assert.equal(await writes(), writeCount, 'Shop consultation must make zero confirmed-record writes.');
      assert.equal(await submits(), submitCount, 'Shop consultation must never submit the real-state form.');
      assert.deepEqual(await inventory(), originalInventory, 'Shop offers never acquire a joker.');
      assert.deepEqual(await voucherInventory(), originalVouchers, 'Shop vouchers stay separate from acquired vouchers.');
      assert.equal(await page.locator('#money').inputValue(), '25', 'Consultation never deducts actual money.');
    };
    const addJoker = async id => {
      await page.locator('#bay-search').fill(id);
      await page.locator(`[data-bay-joker="${id}"]`).click();
      assert.equal(await page.locator('#bay-candidate').innerText(), 'Poner en tienda');
      await page.locator('#bay-candidate').click();
      await page.locator('#bay-dialog').waitFor({ state: 'hidden' });
      await checkpoint();
      return page.locator(`.candidate-card[data-candidate="${id}"]`);
    };
    const advice = async () => {
      await page.locator('#shop-recommendation').click();
      await page.locator('#shop-advice-dialog').waitFor({ state: 'visible' });
      return page.locator('#shop-advice-dialog');
    };
    const close = async () => { await page.keyboard.press('Escape'); };
    const addExtra = async (kind, id, price) => {
      await page.locator(`#store-${kind}-add`).click();
      await page.locator('#store-item-editor').waitFor({ state: 'visible' });
      await page.locator('#store-item-id').selectOption(id);
      if (price !== undefined) await page.locator('#store-item-price').fill(String(price));
      await page.locator('#store-item-save').click();
      await page.locator('#store-item-editor').waitFor({ state: 'hidden' });
      if (kind === 'voucher') await checkpoint();
      return page.locator(`.store-extra-tile[data-store-kind="${kind}"]`).last();
    };
    return { context, page, go, stored, writes, submits, inventory, original, originalVouchers, unchanged, checkpoint, addJoker, advice, close, addExtra };
  }

  const main = await session(fixture());
  const { page: p } = main;
  assert.equal(await p.locator('.board > .shop-panel').count(), 0);
  assert.equal(await p.locator('#joker-candidates').count(), 1);
  assert.match(await p.locator('#joker-candidates > .section-title h2').first().innerText(), /Tienda/);
  assert.equal(await p.locator('.candidate-delta').count(), 0);
  assert.equal(await p.locator('.scenario').count(), 0);
  assert.equal(await p.locator('#shop-recommendation').isDisabled(), true, 'An empty shop cannot give purchase advice before offers are transcribed.');

  const joker = await main.addJoker('j_joker');
  assert.equal(await p.locator('#shop-recommendation').isEnabled(), true, 'A real transcribed offer enables advice.');
  assert.equal(await joker.getAttribute('data-preview-status'), 'fit');
  await joker.locator('.candidate-hero').click();
  let price = p.locator('.candidate-dialog[open] input[id^="store-price-"]');
  assert.equal(await price.inputValue(), '2', 'Joker starts with its catalogue suggestion $2.');
  await price.fill('1');
  const submitsBeforeEnter = await main.submits();
  await price.press('Enter');
  assert.equal(await main.submits(), submitsBeforeEnter, 'Enter in a store price cannot implicitly submit the real-state form.');
  assert.equal(await p.locator('.candidate-dialog[open]').count(), 1);
  assert.equal(await p.locator('#confirmation[open]').count(), 0);
  await main.unchanged();
  pass('price-enter', 'Enter in observed-price input preserves the open editor and makes no state-form submit or confirmed write', { stateFormSubmits: 0, confirmedWrites: 0 });
  assert.equal(await p.locator('.candidate-dialog[open] .bay-score-value').count(), 0);
  await price.press('Tab'); // Completed observed-price edit persists separately.
  await p.waitForFunction(() => document.querySelector('.candidate-card[data-candidate="j_joker"] .store-joker-price')?.textContent === '$1');
  await main.checkpoint();
  await main.close();
  // The shop recomputes automatically from current run inputs.
  await p.locator('#money').fill('26');
  await p.locator('#money').fill('25');
  await p.waitForFunction(() => document.querySelector('.candidate-card[data-candidate="j_joker"]')?.dataset.previewStatus === 'fit');
  await joker.locator('.candidate-hero').click();
  price = p.locator('.candidate-dialog[open] input[id^="store-price-"]');
  assert.equal(await price.inputValue(), '1', 'Recalculation preserves the manually observed price.');
  await main.close();
  let advice = await main.advice();
  const jokerAdvice = advice.locator(`[data-advice-offer="${await joker.getAttribute('data-offer-id')}"]`);
  assert.match(await jokerAdvice.innerText(), /\$24|25\s*→\s*24/);
  assert.equal(await jokerAdvice.getAttribute('data-coverage'), 'limited', 'Manual discounted price keeps H2 coverage limited.');
  await jokerAdvice.locator('details > summary').click();
  assert.match(await jokerAdvice.innerText(), /H2.*desconocid|compra.*(?:desconocid|sin validar)|precio.*catálogo/i);
  await main.close();
  await main.unchanged();
  pass('observed-joker-price', 'Joker $2 suggestion → observed $1; $25 → $24 after recomputation; no acquisition', { suggested: 2, observed: 1, projectedMoney: 24, realMoney: 25 });

  // Recalculation above used an explicitly unsaved base-field edit. Discard it
  // before recording another observation; SHOP03a must not merge a dirty draft.
  await p.reload();
  await p.waitForFunction(() => document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
  await p.waitForFunction(() => document.querySelectorAll('.bay-mini').length === 150);
  await main.checkpoint();

  const steel = await main.addJoker('j_steel_joker');
  await steel.locator('.candidate-hero').click();
  assert.match(await p.locator('.candidate-dialog[open]').innerText(), /Sin Acero/);
  await main.close();
  advice = await main.advice();
  assert.ok(['conditional', 'tie', 'abstain'].includes(await p.locator('#shop-recommendation').getAttribute('data-status')));
  assert.match(await advice.innerText(), /condicion|política|heurístic|criterio/i);
  assert.doesNotMatch(await advice.innerText(), /(?:es la|garantiza la) compra óptima|probabilidad de ganar:\s*\d|rentabilidad garantizada:\s*\d/i);
  const steelAdvice = advice.locator(`[data-advice-offer="${await steel.getAttribute('data-offer-id')}"]`);
  assert.equal(await steelAdvice.count(), 1);
  assert.equal(await steelAdvice.getAttribute('data-recommended'), 'false');
  assert.match(await steelAdvice.innerText(), /Sin Acero|no.*(?:aport|aument)|evitar|esperar/i);
  await main.close();
  await main.unchanged();
  pass('current-deck', 'Known standard52 has zero Steel: no purchase recommendation for Steel Joker', { steelCards: 0, bought: false });

  const voucher = await main.addExtra('voucher', 'v_seed_money', 4);
  assert.ok(await voucher.locator('.voucher-art').count(), 'The visible voucher uses the actual voucher sprite.');
  assert.match(await voucher.locator('.voucher-art').evaluate(art => getComputedStyle(art).backgroundImage), /assets\/vouchers\/atlas\.png/);
  assert.equal(await p.locator('#vouchers [data-voucher="v_seed_money"]').getAttribute('data-owned'), 'false');
  advice = await main.advice();
  let voucherAdvice = advice.locator(`[data-advice-offer="${await voucher.getAttribute('data-offer-id')}"]`);
  assert.equal(await voucherAdvice.count(), 1);
  assert.match(await voucherAdvice.innerText(), /\$21|25\s*→\s*21/);
  assert.doesNotMatch(await voucherAdvice.innerText(), /saldo.*\$50|dinero.*\$50|cobro(?: inmediato)?:.*\$|intereses recibidos/i);
  assert.match(await voucherAdvice.innerText(), /tope|capacidad|interés|intereses/i);
  await main.close();
  await main.unchanged();
  await voucher.locator('.store-extra-inspect').click();
  assert.equal(await p.locator(`[data-voucher-confirm="${await voucher.getAttribute('data-offer-id')}"]`).isDisabled(), true, 'The observed $4 voucher cannot be confirmed under the base-price-only H2 rule.');
  assert.match(await p.locator('#voucher-confirm-note').innerText(), /precio.*base|base.*\$10/i);
  const discountedVoucher = await p.evaluate(async ({ key, id }) => {
    const record = JSON.parse(localStorage.getItem(key));
    const [{ inspectShopDecision }, { readShopSnapshot }] = await Promise.all([
      import('/dist/src/advisor/decision.js'), import('/dist/src/ui/storefront.js'),
    ]);
    const result = inspectShopDecision(record.state, readShopSnapshot());
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.value.voucherActions.find(action => action.optionId === id);
  }, { key: storageKey, id: await voucher.getAttribute('data-offer-id') });
  assert.equal(discountedVoucher.errors[0].code, 'unsupported_price');
  assert.equal(discountedVoucher.confirmation, 'unavailable');
  assert.equal(await p.locator('#confirmation[open]').count(), 0);
  await main.close();
  await main.unchanged();
  pass('voucher-projection', 'Observed Seed Money $4 persists without acquisition: contextual $25−$4=$21, no immediate interest income, H2 explicitly refuses unsupported_price', { price: 4, projectedMoney: 21, realMoney: 25, owned: false, persisted: true, h2Error: 'unsupported_price' });

  await p.locator('#store-pack-add').click();
  const packChoices = await p.locator('#store-item-id option').evaluateAll(options => options.map(option => option.value).filter(Boolean));
  assert.deepEqual([...packChoices].sort(), [
    'arcana-normal', 'arcana-jumbo', 'arcana-mega',
    'celestial-normal', 'celestial-jumbo', 'celestial-mega',
    'standard-normal', 'standard-jumbo', 'standard-mega',
    'spectral-normal', 'spectral-jumbo', 'spectral-mega',
    'buffoon-normal', 'buffoon-jumbo', 'buffoon-mega',
  ].sort(), 'The pack selector has the 15 real family/size combinations.');
  await p.locator('#store-item-id').selectOption('arcana-normal');
  assert.equal(await p.locator('#store-item-price').inputValue(), '4');
  await p.locator('#store-item-save').click();
  await p.locator('#store-item-editor').waitFor({ state: 'hidden' });
  const arcana = p.locator('.store-extra-tile[data-store-kind="pack"]').last();
  const arcanaId = await arcana.getAttribute('data-offer-id');
  const mega = await main.addExtra('pack', 'standard-mega');
  assert.equal(await p.locator('.store-extra-tile[data-store-kind="pack"]').count(), 2);
  assert.equal(await p.locator('.store-extra-tile[data-store-kind="pack"] .booster-art').count(), 2);
  const boosterSprites = await p.locator('.store-extra-tile[data-store-kind="pack"] .booster-art').evaluateAll(arts => arts.map(art => ({ image: getComputedStyle(art).backgroundImage, position: getComputedStyle(art).backgroundPosition })));
  for (const sprite of boosterSprites) assert.match(sprite.image, /assets\/boosters\/atlas\.png/);
  assert.notEqual(boosterSprites[0].position, boosterSprites[1].position, 'Distinct observed packs use distinct cells in the original atlas.');
  advice = await main.advice();
  const arcanaAdvice = advice.locator(`[data-advice-offer="${arcanaId}"]`);
  const megaAdvice = advice.locator(`[data-advice-offer="${await mega.getAttribute('data-offer-id')}"]`);
  assert.match(await arcanaAdvice.innerText(), /\$21|25\s*→\s*21/);
  assert.match(await megaAdvice.innerText(), /(?:muestra|verás|cartas)\D*5|5\s*cartas/i);
  assert.match(await megaAdvice.innerText(), /(?:elige|elecciones|escoger)\D*2|2\s*(?:elecciones|cartas)/i);
  assert.match(await megaAdvice.innerText(), /cerrad|contenido.*(?:desconocid|no conoc)|no.*contenido/i);
  assert.equal(await advice.locator('.bay-score-value,.candidate-delta,.deck-card-editor,.bay-mini').count(), 0);
  assert.doesNotMatch(await megaAdvice.innerText(), /Δ\s*[+−-]?\d|\+\d+\s*(?:puntos|índice)/i);
  await main.close();
  await main.unchanged();
  pass('closed-packs', '15 choices; Arcana $4 → $21; Standard Mega shows five and chooses two, with unknown contents', { choices: 15, packOffers: 2, generatedCards: 0, megaShown: 5, megaChoices: 2 });

  await p.locator('#store-other-add').click();
  await p.locator('#store-item-editor').waitFor({ state: 'visible' });
  await p.locator('#store-item-kind').selectOption('tarot');
  await p.locator('#store-item-name').fill('El Mago observado');
  await p.locator('#store-item-price').fill('3');
  await p.locator('#store-item-save').click();
  await p.locator('#store-item-editor').waitFor({ state: 'hidden' });
  const other = p.locator('.store-extra-tile[data-store-kind="other"]');
  assert.equal(await other.count(), 1);
  assert.match(await other.innerText(), /El Mago observado/);
  advice = await main.advice();
  const otherAdvice = advice.locator(`[data-advice-offer="${await other.getAttribute('data-offer-id')}"]`);
  assert.equal(await otherAdvice.count(), 1);
  assert.equal(await otherAdvice.getAttribute('data-coverage'), 'unknown');
  await otherAdvice.locator('details > summary').click();
  assert.match(await otherAdvice.innerText(), /fuera|sin.*(?:cobertura|implementar)|no.*implement|condicion|objetiv/i);
  assert.equal(await otherAdvice.getAttribute('data-recommended'), 'false');
  await main.close();
  await main.unchanged();
  pass('other-visible-offer', 'A transcribed Tarot preserves name/observed price and declares effect limits', { name: 'El Mago observado', price: 3, acquired: false });

  const beforeOffers = await p.locator('.candidate-card,.store-extra-tile').count();
  const shop = p.locator('#joker-candidates');
  assert.equal(await p.locator('#store-reroll-cost').count(), 0, 'The advisor has no game reroll control.');
  assert.equal(await shop.getByRole('button', { name: /^(?:Actualizar|Renovar(?: ofertas)?|Reroll|Next Round|Siguiente ronda)$/i }).count(), 0);
  assert.equal(await shop.getByRole('button', { name: 'Buscar comodín', exact: true }).count(), 1);
  assert.equal(await p.locator('#shop-recommendation').count(), 1);
  assert.equal(await p.locator('#store-new-shop').innerText(), 'Vaciar ofertas visibles');
  assert.equal(await shop.locator('.store-controls > button').count(), 2);
  const layout = await shop.evaluate(panel => {
    const box = selector => {
      const b = panel.querySelector(selector).getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    };
    return {
      controls: box('.store-controls'), cards: box('.store-card-well'),
      voucher: box('.store-voucher-well'), packs: box('.store-pack-well'),
      border: getComputedStyle(panel).borderTopColor,
    };
  });
  assert.ok(layout.controls.right < layout.cards.left, 'Desktop advisor controls sit left of the card well.');
  assert.ok(layout.voucher.right < layout.packs.left, 'Voucher well sits left of the two-pack well.');
  assert.ok(layout.voucher.top >= layout.cards.bottom, 'Voucher and pack wells sit below cards.');
  const borderChannels = layout.border.match(/\d+/g).map(Number);
  assert.ok(borderChannels[0] > borderChannels[1] && borderChannels[0] > borderChannels[2], 'The shop frame has a red border.');
  const displayedPrices = await shop.locator('.candidate-card').evaluateAll(cards => cards.map(card => {
    const price = card.querySelector('.store-joker-price'), art = card.querySelector('.candidate-hero > .joker-art');
    return { above: price.getBoundingClientRect().top < art.getBoundingClientRect().top, color: getComputedStyle(price).color };
  }));
  for (const price of displayedPrices) {
    assert.equal(price.above, true, 'Observed price appears above card art.');
    const channels = price.color.match(/\d+/g).map(Number);
    assert.ok(channels[0] > channels[2] && channels[1] > channels[2], 'Observed prices use yellow/gold text.');
  }
  advice = await main.advice();
  assert.equal(await advice.locator('[data-advice-offer="reroll"]').count(), 0, 'Unavailable game renewal is excluded from this advisor UI.');
  assert.equal(await advice.getByRole('button', { name: /^(?:Actualizar|Renovar(?: ofertas)?|Reroll|Next Round|Siguiente ronda)$/i }).count(), 0);
  assert.equal(await advice.locator('[data-write="true"]').count(), 0, 'Advice exposes no confirmation transaction.');
  await main.close();
  assert.equal(await p.locator('.candidate-card,.store-extra-tile').count(), beforeOffers);
  const recommendationTheme = () => p.locator('#shop-recommendation').evaluate(button => ({
    status: button.dataset.status, background: getComputedStyle(button).backgroundColor, hovered: button.matches(':hover'),
  }));
  await p.mouse.move(0, 0);
  const idleTheme = await recommendationTheme();
  await p.locator('#shop-recommendation').hover();
  const hoverTheme = await recommendationTheme();
  assert.equal(idleTheme.status, hoverTheme.status, 'Hover changes styling without changing the recommendation status.');
  await p.mouse.move(0, 0);
  await main.unchanged();
  pass('advisor-controls', 'Balatro-style red frame, controls left, prices above cards, voucher/pack wells below; only search/advice/clear actions', { rerollInput: false, gameActionButtons: 0, realMoney: 25, offersUnchanged: true, controlsLeft: true, voucherLeft: true, pricesAbove: true, idleTheme, hoverTheme });

  // Responsive bounds concern the whole observed shop, not the former 160px
  // shortlist height. Intentional inner scrolling still stays within the page.
  for (const width of [360, 390, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    await p.mouse.move(0, 0); // Capture the recommendation's idle status colour.
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No document overflow at ' + width);
    const upperRows = await shop.locator('.store-card-well .candidate-grid > .candidate-card,.store-card-well .candidate-grid > .store-extra-tile').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().top));
    assert.equal(upperRows.length, 3, 'Jokers and the transcribed Tarot share the upper card row.');
    assert.ok(upperRows.every(top => top === upperRows[0]), 'Other visible cards remain in the same upper row at ' + width);
    const completeCards = await shop.locator('.candidate-card').evaluateAll(cards => cards.map(card => {
      const row = card.closest('.candidate-grid').getBoundingClientRect(), hero = card.querySelector('.candidate-hero').getBoundingClientRect();
      const complete = selector => {
        const element = card.querySelector(selector), b = element.getBoundingClientRect();
        return b.height > 0 && b.top >= row.top - 1 && b.bottom <= row.bottom + 1 && b.top >= hero.top - 1 && b.bottom <= hero.bottom + 1;
      };
      return { art: complete('.candidate-hero > .joker-art'), name: complete('.candidate-info h4'), index: complete('.candidate-info > .fit-score') };
    }));
    for (const card of completeCards) {
      assert.equal(card.art, true, 'The complete joker art fits vertically within the card row at ' + width);
      assert.equal(card.name, true, 'The joker name fits vertically within the card row at ' + width);
      assert.equal(card.index, true, 'The contextual index fits vertically within the card row at ' + width);
    }
    const packTops = await p.locator('.store-pack-well .store-extra-tile[data-store-kind="pack"]').evaluateAll(packs => packs.map(pack => pack.getBoundingClientRect().top));
    assert.equal(packTops.length, 2);
    assert.equal(packTops[0], packTops[1], 'Both observed packs share their lower tray row at ' + width);
    await p.locator('#joker-candidates').screenshot({ path: `${dir}/shop-${width}.png` });
    advice = await main.advice();
    assert.equal(await p.evaluate(() => {
      const box = document.querySelector('#shop-advice-dialog').getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
    }), true, 'Advice dialog fits viewport at ' + width);
    assert.equal(await advice.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth), true, 'Advice content has no horizontal overflow at ' + width);
    await advice.screenshot({ path: `${dir}/advice-${width}.png` });
    await advice.locator('[data-kind="pack"]').last().scrollIntoViewIfNeeded();
    await advice.screenshot({ path: `${dir}/advice-packs-${width}.png` });
    await main.close();
  }
  await main.unchanged();
  pass('responsive', 'Shop/advice fit 360, 390 and 1440px without page overflow; full joker art/name/index and other cards share the upper row', { widths: [360, 390, 1440], completeJokerCards: true, upperRowOffers: 3, physicalMobileTest: false });
  await p.locator('#store-new-shop').click();
  await main.checkpoint();
  assert.equal(await p.locator('.candidate-card,.store-extra-tile').count(), 0, 'Clear offers removes persisted joker/voucher offers and temporary packs/other cards.');
  assert.equal(await p.locator('#store-reroll-cost').count(), 0);
  assert.equal(await p.locator('#shop-recommendation').isDisabled(), true, 'Clearing the shop also disables advice.');
  await main.unchanged();
  await p.locator('#joker-candidates').screenshot({ path: `${dir}/shop-reset-1440.png` });
  await p.setViewportSize({ width: 390, height: 900 });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await p.locator('#joker-candidates').screenshot({ path: `${dir}/shop-reset-390.png` });
  await p.setViewportSize({ width: 1440, height: 900 });
  pass('clear-offers', 'Clear offers persists removal of observed jokers and vouchers, clears session packs/other cards and disables advice while preserving $25 and inventory', { offers: 0, adviceDisabled: true, realMoney: 25, purchased: false });
  // Refill after reset: joker/voucher observations persist; packs/other cards remain temporary.
  await main.addJoker('j_joker');
  await main.addExtra('voucher', 'v_seed_money', 4);
  await main.addExtra('pack', 'arcana-normal');
  await p.locator('#store-other-add').click();
  await p.locator('#store-item-name').fill('El Mago temporal');
  await p.locator('#store-item-price').fill('3');
  await p.locator('#store-item-save').click();
  await p.locator('#store-item-editor').waitFor({ state: 'hidden' });
  assert.equal(await p.locator('.candidate-card,.store-extra-tile').count(), 4);
  await main.unchanged();
  const beforeReload = await main.stored();
  await p.reload();
  await p.waitForFunction(() => document.querySelectorAll('.bay-mini').length === 150 && document.querySelector('#store-new-shop')?.dataset.localDisabled === 'false');
  await main.go('table');
  assert.equal(await main.stored(), beforeReload, 'Reload itself must not rewrite the record.');
  assert.equal(await p.locator('.candidate-card[data-candidate="j_joker"]').count(), 1, 'Observed joker offer is restored without being acquired.');
  assert.equal(await p.locator('.store-extra-tile[data-store-kind="voucher"]').count(), 1, 'The observed voucher is restored without being acquired.');
  assert.match(await p.locator('.store-extra-tile[data-store-kind="voucher"]').innerText(), /\$4/);
  assert.equal(await p.locator('.store-extra-tile[data-store-kind="pack"],.store-extra-tile[data-store-kind="other"]').count(), 0, 'Pack/other observations remain session-only.');
  assert.deepEqual(await main.inventory(), []);
  assert.equal(await p.locator('#money').inputValue(), '25');
  assert.deepEqual(await p.locator('#vouchers [data-owned="true"]').evaluateAll(rows => rows.map(row => row.dataset.voucher)), []);
  const restored = JSON.parse(await main.stored()).state;
  assert.equal(restored.observed.shop.value.voucherOffers[0].catalogId, 'v_seed_money');
  assert.deepEqual(restored.observed.outOfScope.value.vouchers, []);
  pass('observed-offers-reload', 'Reload restores observed Joker and Seed Money $4 without payment/acquisition, discards temporary packs/other cards', { persistedJokers: 1, persistedVouchers: 1, sessionExtras: 0, acquiredJokers: 0, acquiredVouchers: 0, realMoney: 25, reloadWrites: 0 });
  await main.context.close();

  const prerequisite = await session(fixture());
  const missingVoucher = await prerequisite.addExtra('voucher', 'v_money_tree');
  advice = await prerequisite.advice();
  voucherAdvice = advice.locator(`[data-advice-offer="${await missingVoucher.getAttribute('data-offer-id')}"]`);
  assert.match(await voucherAdvice.innerText(), /Seed Money|Siembra dinero|v_seed_money/i);
  assert.match(await voucherAdvice.innerText(), /requisito|requiere|falta|discrepancia/i);
  assert.equal(await voucherAdvice.getAttribute('data-recommended'), 'false');
  await prerequisite.close();
  await prerequisite.unchanged();
  await prerequisite.context.close();

  const acquired = await session(fixture({ vouchers: ['v_seed_money'] }));
  assert.equal(await acquired.page.locator('#vouchers [data-voucher="v_seed_money"]').getAttribute('data-owned'), 'true');
  const duplicateVoucher = await acquired.addExtra('voucher', 'v_seed_money');
  advice = await acquired.advice();
  voucherAdvice = advice.locator(`[data-advice-offer="${await duplicateVoucher.getAttribute('data-offer-id')}"]`);
  assert.match(await voucherAdvice.innerText(), /ya.*(?:adquirid|pose|registrad)|adquirido.*previamente/i);
  assert.equal(await voucherAdvice.getAttribute('data-recommended'), 'false');
  await acquired.close();
  await acquired.unchanged();
  await acquired.context.close();
  pass('voucher-prerequisites', 'Money Tree without Seed Money is flagged; acquired Seed Money never recommended again', { missingPrerequisiteFlagged: true, duplicateFlagged: true, inventoryChanged: false });

  const blueprint = await session(fixture({ jokers: [ownedJoker('joker')] }));
  const copy = await blueprint.addJoker('j_blueprint');
  await copy.locator('.candidate-hero').click();
  assert.match(await blueprint.page.locator('.candidate-dialog[open]').innerText(), /1 objetivos compatibles|objetivo.*compatibl/i);
  assert.match(await blueprint.page.locator('.candidate-dialog[open]').innerText(), /posición|condicion/i);
  await blueprint.close();
  advice = await blueprint.advice();
  assert.doesNotMatch(await advice.innerText(), /(?:es la|garantiza la) compra óptima|objetivo garantizado/i);
  assert.deepEqual(await blueprint.inventory(), ['joker']);
  await blueprint.close();
  await blueprint.unchanged();
  await blueprint.context.close();
  pass('blueprint-context', 'Existing compatible Joker supports hypothetical Blueprint, subject to order and target conditions', { compatibleOwned: 1, acquiredBlueprint: false });

  assert.deepEqual(errors, []);
  report.status = 'passed';
  report.pageErrors = errors;
  await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log('PASS tienda: observed prices, literal balances, current-deck context, vouchers/prerequisites, 15 closed pack types, advisor controls/no game renewal, zero consultation writes/acquisitions and 360/390/1440px');
} catch (error) {
  report.status = 'failed';
  report.error = error.stack || error.message;
  await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2) + '\n');
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
