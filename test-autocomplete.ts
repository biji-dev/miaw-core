/**
 * Test script to verify tab autocomplete in REPL
 *
 * This script demonstrates the autocomplete functionality.
 * Start the REPL with: npm run cli
 *
 * Then try these autocomplete examples:
 *
 * 1. Type "ins" and press TAB → should complete to "instances"
 * 2. Type "instance " and press TAB → should show all subcommands
 * 3. Type "get " and press TAB → should show: contacts, groups, chats, messages, labels, profile
 * 4. Type "get contacts --" and press TAB → should show: --json, --limit
 * 5. Type "use " and press TAB → should show available instance IDs
 * 6. Type "ex" and press TAB → should show "exit"
 */

console.log(`
To test tab autocomplete:

1. Start the REPL:
   npm run cli

2. Try these commands (press TAB at each step):

   a) Type "ins" + TAB
      → Should complete to "instances"

   b) Type "instance " + TAB (note the space)
      → Should show: create, delete, disconnect, ls, list, logout, status, connect

   c) Type "get " + TAB
      → Should show: chats, contacts, groups, labels, messages, profile

   d) Type "get contacts --" + TAB
      → Should show: --json, --limit

   e) Create an instance first:
      instance create test
      Then type "use " + TAB
      → Should show: default, test

   f) Type "ex" + TAB
      → Should show: exit

   g) Type "send " + TAB
      → Should show: document, image, text

   h) Type "group " + TAB (this was the bug!)
      → Should show: create, info, invite-link, participants
      → BEFORE FIX: would show all top-level commands
      → AFTER FIX: correctly shows subcommands

=== FIX SUMMARY ===
Changed Level 1 condition from:
  parts.length === 1 || (parts.length === 2 && currentPart === "")
To:
  parts.length === 1

Changed Level 2 condition from:
  parts.length === 2 || (parts.length === 3 && currentPart === "")
To:
  parts.length >= 2

This ensures that when typing "group " (command + space + TAB),
the completer correctly shows subcommands instead of top-level commands.
`);
