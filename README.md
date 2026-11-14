# Stall Tokens

A quick ordering and token app for fair stalls. Open [the live app](https://steph1420.github.io/stall-tokens/) on a phone or tablet, or open `index.html` locally — it is a single self-contained file with no network required after the first load.

Tap big menu buttons to build an order, place it to issue the next token, then mark tickets Ready and Collected from the queue. A Now serving screen shows ready token numbers to customers. Menu, day takings (cash / UPI split and a CSV export), and stall settings live in the other tabs. Everything is stored in this browser’s localStorage, so a refresh never loses the day.

## Sync (not built yet)

Local Bluetooth sync and internet sync between devices are planned. The data layer is already structured for that: every order and menu change is an event with a unique id, a device id and a timestamp, kept in one store module. Later adapters can call `Store.exportEvents()`, `Store.importEvents(remote)` (merge by id, then sort and re-reduce) and `Store.setSyncAdapter(adapter)`. Until then, each device keeps its own copy — there is no cross-device sync while you are offline.

## Use it at a stall

Add the page to your home screen for a full-screen app. Set the stall name and currency (₹ by default) in Settings. Start a new day from the Day tab when you want a fresh token counter.
