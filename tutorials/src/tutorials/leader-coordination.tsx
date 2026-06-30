import { Note, Step } from '../components/bits';
import { CodeSnippet } from '../components/code-snippet';
import type { TutorialContent } from '../components/tutorial-layout';

export const leaderCoordinationTutorial: TutorialContent = {
  title: 'Leader mode and talking across frames',
  summary:
    'A walkthrough of the new files in src/coordination/. They let one key open a "leader mode", and they let frames on a page talk to each other so the right video gets the key. Everything only logs for now.',
  intro: (
    <>
      <p>
        This lesson walks through a set of new files in <code>src/coordination/</code>. They are built but not yet
        turned on for real: right now they mostly write messages to the console so we can watch them work. Read this to
        review what each file does and how they fit together.
      </p>
      <p>There are two ideas mixed in here. We will keep them apart:</p>
      <ul>
        <li>
          <strong>Leader mode</strong>: press one key (the letter <code>q</code>) to turn on a mode. While it is on,
          simple keys like <code>v</code> or <code>s</code> do things, instead of having to hold <code>Ctrl</code> and{' '}
          <code>Alt</code> and another key all at once.
        </li>
        <li>
          <strong>Cross-frame talking</strong>: a web page can hold smaller pages inside it, called frames. A video can
          live inside one of these inner frames. We need the key you press to reach the frame that owns the video, even
          when that is not the frame you are looking at.
        </li>
      </ul>
    </>
  ),
  sections: [
    {
      id: 'two-problems',
      title: '1. The two problems',
      content: (
        <>
          <p>
            <strong>Problem one: too few keys.</strong> The extension has many actions: faster, slower, reset, show or
            hide the box, and more. If each action needs its own key combination, we run out of easy ones. We end up
            with hard combinations like <code>Ctrl</code> + <code>Alt</code> + <code>v</code>, and many of those are
            already used by the website or the browser.
          </p>
          <p>
            Leader mode fixes this. You tap <code>q</code> once. Now the extension is listening. You tap <code>v</code>,
            and that runs an action. One key opens the door; the next key picks the action. We do not need combinations
            any more.
          </p>
          <p>
            <strong>Problem two: frames.</strong> A page can put another page inside itself with an <code>iframe</code>.
            Think of a small window inside the big window. Some video sites put their video inside one of these inner
            frames. The browser only sends a key press to the one frame that is "focused" — the one you last clicked in.
          </p>
          <p>
            So if the video is in an inner frame, but you last clicked on the outer page, the key goes to the outer
            page, which has no video. The inner frame, which has the video, hears nothing. This is why you sometimes
            have to click on the video first before the keys work.
          </p>
          <Note title="Two words we will use a lot">
            <strong>Frame</strong>: a page. The big outer one is the "top" frame. A page inside it is an "iframe". <br />
            <strong>Controller</strong>: the little box the extension shows on a video. One video, one controller.
          </Note>
        </>
      ),
    },
    {
      id: 'the-flags',
      title: '2. flags.js — the on and off switches',
      content: (
        <>
          <p>
            Every new piece is behind a switch in one small file. This lets us turn things on or off by hand while we
            test, without touching the real code. Two switches turn the whole thing on. One more, <code>
            LEADER_SWALLOW</code>, decides if leader mode is allowed to "eat" keys (stop the page from seeing them). It
            is off for now, so keys still reach the page and we cannot break anything yet.
          </p>
          <CodeSnippet
            path="src/coordination/flags.js"
            startMatch="export const LEADER_SWALLOW"
            caption="When this is off, leader mode only watches keys; it does not take them away from the page."
          />
          <p>
            The list of leader keys lives here too. Each letter maps to one action name. So <code>v</code> means "show
            or hide the box", <code>s</code> means "slower", and so on.
          </p>
          <CodeSnippet
            path="src/coordination/flags.js"
            startMatch="export const LEADER_BINDINGS"
            caption="Bare key on the left, action name on the right."
          />
        </>
      ),
    },
    {
      id: 'leader-mode',
      title: '3. leader-mode.js — catching the keys',
      content: (
        <>
          <p>
            This file holds the leader mode. It listens for key presses and decides what to do. The most important
            choice is <em>where</em> it listens and <em>how early</em>.
          </p>
          <p>
            It listens on <code>window</code> with a setting called <code>capture</code>. A key press travels through
            the page in two trips: first down from the top (the "capture" trip), then back up (the "bubble" trip). By
            listening on <code>window</code> during the capture trip, this code runs before the website's own key code.
            That is how it can win the key before the page reacts.
          </p>
          <CodeSnippet
            path="src/coordination/leader-mode.js"
            startMatch="start() {"
            caption="Listen on window, in the capture trip, so we run first."
          />
          <p>
            The handler for a key press has a simple shape. If leader mode is off and you press the trigger key
            (<code>q</code>), it turns the mode on. If the mode is on, the next key is looked up in the bindings list. If
            it matches, we call the action; if not, nothing happens. <code>Escape</code> turns the mode off.
          </p>
          <CodeSnippet
            path="src/coordination/leader-mode.js"
            startMatch="_onKeyDown(event)"
            caption="The whole key flow: open the mode, then map the next key to an action."
          />
          <p>
            There is one shared place where keys get "eaten". It is gated by the <code>LEADER_SWALLOW</code> switch from
            the flags file. When the switch is on, it calls two browser methods: <code>preventDefault</code> (do not do
            the page's normal thing for this key) and <code>stopImmediatePropagation</code> (do not let any other code
            see this key). When the switch is off, it only writes a log line and lets the key pass.
          </p>
          <CodeSnippet
            path="src/coordination/leader-mode.js"
            startMatch="_swallow(event, key, reason)"
            caption="One gate. With the switch off, keys are not taken; with it on, they are."
          />
          <Note title="What this cannot do">
            Some keys never reach the page at all, so this code can never catch them: things like{' '}
            <code>Ctrl</code> + <code>T</code> (new tab) or the function keys. The browser keeps those for itself. Also,
            another extension could try to grab keys the same way; who wins depends on load order. So owning the
            keyboard is "best effort", not a promise.
          </Note>
        </>
      ),
    },
    {
      id: 'leader-indicator',
      title: '4. leader-indicator.js — the badge you see',
      content: (
        <>
          <p>
            When leader mode turns on, we show a small badge in the middle of the screen so you know it is listening.
            When the mode turns off, the badge goes away. This file builds that badge.
          </p>
          <p>
            The badge is built inside its own <strong>shadow DOM</strong> — a small private room inside an element. The
            page's styles cannot leak in and change how the badge looks, and the badge's styles cannot leak out and
            change the page. It does not need a video or a controller to work, so it can show in any frame.
          </p>
          <p>
            One detail matters for safety. Some sites (like YouTube) block code that builds HTML from a plain text
            string. So instead of setting <code>innerHTML</code> with a string, we build each small piece with{' '}
            <code>createElement</code>. This way the badge works even on those strict sites.
          </p>
          <CodeSnippet
            path="src/coordination/leader-indicator.js"
            startMatch="Build children programmatically"
            caption="Build the badge piece by piece, not from an HTML string, so strict sites do not block it."
          />
        </>
      ),
    },
    {
      id: 'the-frame-problem',
      title: '5. Why one frame cannot do it alone',
      content: (
        <>
          <p>
            Now back to frames. The extension runs a full copy of itself in every frame. Each copy has its own key
            listener and its own list of controllers. They do not know about each other.
          </p>
          <p>
            The browser sends a key only to the focused frame. We cannot change that. So we cannot make one frame hear
            every key. Instead, we let each frame catch its own keys, and then we let the frames talk. One frame becomes
            the leader of the talk. We call it the <strong>hub</strong>. The others are <strong>spokes</strong>, like on
            a bicycle wheel. The top frame is both the hub and a spoke.
          </p>
          <Note title="Hub and spoke">
            <strong>Hub</strong>: the top frame. It keeps a list of which frames have videos, and it decides who should
            handle a key. <br />
            <strong>Spoke</strong>: every frame. It catches its own keys and tells the hub. It also listens for the hub
            to tell it "you handle this one".
          </Note>
        </>
      ),
    },
    {
      id: 'messages',
      title: '6. messages.js — the shape of a note',
      content: (
        <>
          <p>
            Frames talk by sending small notes with a browser method called <code>postMessage</code>. But the page
            itself can also send notes, and so can other extensions. So we put a special tag on every note of ours, and
            we ignore any note that does not have the tag.
          </p>
          <p>
            This file holds the tag, the list of note types, and two tiny helpers: one to build a tagged note, and one
            to read a note and check the tag.
          </p>
          <CodeSnippet
            path="src/coordination/messages.js"
            startMatch="export const COORD_MSG"
            caption="The kinds of notes frames send each other."
          />
          <CodeSnippet
            path="src/coordination/messages.js"
            startMatch="export function parseMessage"
            caption="Read a note. If it has no tag, return null and the note is ignored."
          />
        </>
      ),
    },
    {
      id: 'frame-coordinator',
      title: '7. frame-coordinator.js — the hub and spoke',
      content: (
        <>
          <p>
            This is the biggest file. It plays both roles. First, each frame gives itself a short name, because the
            browser does not hand out frame names in this part of the code. The name is just the host plus a counter, so
            it is easy to read in the logs.
          </p>
          <CodeSnippet
            path="src/coordination/frame-coordinator.js"
            startMatch="function mintFrameId"
            caption="Make a readable name for this frame, like TOP:youtube.com#1."
          />
          <p>
            As a spoke, when the number of controllers in this frame changes, it tells the hub. This is how the hub
            learns which frames actually have videos.
          </p>
          <CodeSnippet
            path="src/coordination/frame-coordinator.js"
            startMatch="announceControllers()"
            caption="Tell the hub how many controllers this frame has now."
          />
          <p>
            Also as a spoke, when leader mode catches a key, it sends the key to the hub. If this frame is the hub, it
            can decide right away without sending a note.
          </p>
          <CodeSnippet
            path="src/coordination/frame-coordinator.js"
            startMatch="forwardKeyIntent(intent)"
            caption="Send a caught key to the hub to decide who handles it."
          />
          <p>
            As the hub, it reads the notes from the spokes. A note can say "I just started", "my controller count
            changed", or "here is a key I caught".
          </p>
          <CodeSnippet
            path="src/coordination/frame-coordinator.js"
            startMatch="_onMessage(event)"
            caption="The hub reads notes from spokes and acts on them."
          />
          <p>
            The heart of the hub is the part that picks which frame should handle a key. The rule right now is simple: if
            the frame that caught the key has a video, it keeps it. If not, and only one frame has a video, send it
            there. If several frames have videos, it picks the first and logs that the choice was not clear.
          </p>
          <CodeSnippet
            path="src/coordination/frame-coordinator.js"
            startMatch="_route(intent)"
            caption="Decide which frame should handle the key."
          />
        </>
      ),
    },
    {
      id: 'debug',
      title: '8. debug.js — making the logs readable',
      content: (
        <>
          <p>
            Because the code only logs for now, the logs need to be clear. This file has small helpers that turn things
            into short, safe text for a log line. They are wrapped so that even if reading some value fails, the log
            never crashes the real code.
          </p>
          <p>
            The most useful one is <code>focusSnapshot</code>. It tells us which frame is focused and what is selected.
            This is the exact clue we need for the frame problem: if you press keys and the frame with the video does
            not show a log line, that frame is not focused.
          </p>
          <CodeSnippet
            path="src/coordination/debug.js"
            startMatch="export function focusSnapshot"
            caption="A short note about which frame has focus right now."
          />
          <CodeSnippet
            path="src/coordination/debug.js"
            startMatch="export function describeKey"
            caption="Turn a key press into one short, readable string."
          />
        </>
      ),
    },
    {
      id: 'wiring',
      title: '9. How it all gets turned on',
      content: (
        <>
          <p>
            Two existing files were touched to wire this in. The first is the main content script,{' '}
            <code>inject.js</code>. It builds the coordinator and the leader mode when the page sets up, and it connects
            them: a caught leader key is handed to the coordinator to route.
          </p>
          <CodeSnippet
            path="src/content/inject.js"
            startMatch="setupCoordination() {"
            caption="Build the coordinator and leader mode, and connect them."
          />
          <p>
            The second is the state manager, which keeps the list of controllers. It now calls a hook whenever a
            controller is added or removed. The coordinator sets this hook so it can tell the hub when the count
            changes. It is a plain function call, kept simple on purpose.
          </p>
          <CodeSnippet
            path="src/core/state-manager.js"
            startMatch="_notifyControllersChanged()"
            caption="When controllers change, call the hook the coordinator set."
          />
        </>
      ),
    },
    {
      id: 'flash',
      title: '10. flash.js — showing the key arrived',
      content: (
        <>
          <p>
            When a key is routed to a frame, that frame briefly changes the background color of its controllers. This is
            visual proof that the routing worked: you press a key, and the box on the right video lights up for a moment.
            It does not change the speed yet; it only shows that the key reached the right place.
          </p>
          <p>
            The flash fills the inside, not the edge. An outline can blend into whatever color sits behind the pill, but
            a filled background stands out anywhere. It saves the element's current background, sets the flash color,
            then puts the old one back after a short time. It changes only the inline style, so the controller's own
            style sheet is untouched.
          </p>
          <CodeSnippet
            path="src/coordination/flash.js"
            startMatch="export function flashElement"
            caption="Fill the background, then restore the old one after a moment."
          />
          <p>
            One detail matters. The controller has two parts: an outer host box and the visible pill inside its shadow
            room. The outer box can have a size of zero, so an outline on it would show nothing. So we flash the inner
            pill (<code>controllerDiv</code>) and fall back to the host only if the pill is missing.
          </p>
          <CodeSnippet
            path="src/content/inject.js"
            startMatch="flashControllers() {"
            caption="Flash the visible pill, not the host, because the host can be zero-sized."
          />
          <Note title="A known limit">
            Routing right now picks a frame, not a single controller. So if one frame has more than one video, all of its
            controllers flash. Choosing one exact controller is a later step.
          </Note>
        </>
      ),
    },
    {
      id: 'flow',
      title: '11. The whole flow, step by step',
      content: (
        <>
          <p>Here is what happens when you press the keys, with everything turned on:</p>
          <Step n={1} title="Press q">
            The focused frame's leader mode turns on and shows the badge. It writes a log line with which frame it is and
            whether that frame is focused.
          </Step>
          <Step n={2} title="Press v">
            Leader mode looks up <code>v</code> in the bindings. It finds an action and hands it to the coordinator as a
            "caught key".
          </Step>
          <Step n={3} title="Spoke tells hub">
            If this frame is not the hub, it sends the key as a note to the top frame. If it is the hub, it skips the
            note.
          </Step>
          <Step n={4} title="Hub decides">
            The hub looks at which frames have videos and picks one. It logs the choice.
          </Step>
          <Step n={5} title="Hub tells the chosen frame">
            The hub sends a note back to the chosen frame: "you handle this key". That frame logs that it was picked and
            flashes its controllers.
          </Step>
          <Note title="What is not here yet">
            The chosen frame flashes but does not actually run the action, and <code>LEADER_SWALLOW</code> is off so keys
            are not taken from the page. Those are later steps, once we trust what the logs and the flash show.
          </Note>
        </>
      ),
    },
    {
      id: 'what-to-remember',
      title: '12. What to remember',
      content: (
        <ul>
          <li>Leader mode: one key opens it, the next key picks an action. No hard combinations.</li>
          <li>It listens on window in the capture trip, so it runs before the page.</li>
          <li>The browser sends a key only to the focused frame, so frames must talk.</li>
          <li>The top frame is the hub. It tracks which frames have videos and picks who handles a key.</li>
          <li>Notes between frames carry a tag, so we ignore notes that are not ours.</li>
          <li>Switches in flags.js turn each part on or off; for now most things only log.</li>
        </ul>
      ),
    },
  ],
};
