// Plain-JS twin of seed.ts demo ops for the screenshot script (keep in step with src/mock/fixtures.ts).
const menu = [['tea','Tea',2000,0,'Tea','Beverages',24],['coffee','Coffee',3000,1,'Tea','Beverages',null],['samosa','Samosa',1500,2,'Snacks','Cutlets',null],
  ['vadapav','Vada Pav',2500,3,'Snacks','Sandwiches',null],['colddrink','Cold Drink',4000,4,'Drinks','Beverages',3],['sandwich','Sandwich',5000,5,'Snacks','Sandwiches',0]];
export function demoOps() {
  let seq = 0; const mk = (kind, body) => { seq += 1; return { v: 2, opId: `seed0000.p:${seq}`, writer: 'seed0000.p', seq, lamport: seq, vv: {}, wallAt: 1700000000000 + seq, kind, body }; };
  return [...menu.map(([itemId, name, price, swatch, category, stationId, count], i) => mk('item.set', { itemId, fields: { name, price, swatch, category, stationId, count, order: i + 1, lowAt: 5, soldOut: false, removed: false } })),
    mk('payee.set', { payeeId: 'p1', name: 'Stall One', upiId: 'stallone@okbank', removed: false }), mk('setting.set', { key: 'stallName', value: 'Fair stall' })];
}
