import { Compare, DemoFrame, Note, Step } from '../components/bits';
import { CodeSnippet } from '../components/code-snippet';
import type { TutorialContent } from '../components/tutorial-layout';
import { PositioningDemo } from '../demos/positioning-demo';
import { ShadowHostDemo } from '../demos/shadow-host-demo';

export const anchorPositioningTutorial: TutorialContent = {
  title: 'Keeping the controller stuck to the video',
  summary:
    'How the speed controller stays on top of the video when you scroll. One way uses JavaScript; another uses a CSS feature called anchor positioning. We also explain shadow DOM and :host().',
  intro: (
    <>
      When you watch a video, VideoSpeed shows a small box on top of it. The box shows the speed and has buttons. We call
      this box the <strong>controller</strong>. This lesson is about one job: how does the box stay on the right spot, on
      top of the video, even when you scroll the page up and down?
    </>
  ),
  sections: [
    {
      id: 'the-problem',
      title: '1. The problem',
      content: (
        <>
          <p>
            The video and the controller are two different things on the page. The video can be anywhere. It can move
            when you scroll. It can change size when you make the window bigger or go full screen. The controller must
            follow the video and sit on its top-left corner at all times.
          </p>
          <p>
            If the controller does not follow, you see it floating in a wrong place, far from the video. That looks
            broken.
          </p>
          <Note title="Two words we will use a lot">
            <strong>The video</strong>: the thing you watch. <br />
            <strong>The controller</strong> (or "the pill"): the little box with the speed and buttons.
          </Note>
        </>
      ),
    },
    {
      id: 'the-javascript-way',
      title: '2. The JavaScript way: move it with code',
      content: (
        <>
          <p>
            One way is simple. Every time the page scrolls, we ask the browser: "Where is the video right now?" Then we
            move the controller to that spot with code. We do this again and again, many times a second.
          </p>
          <p>
            The function that moves the box is called <code>adjustLocation</code>:
          </p>
          <CodeSnippet
            path="src/ui/shadow-dom-manager.js"
            startMatch="adjustLocation() {"
            caption="Read where the video is, then set the box's top and left by hand."
          />
          <p>
            And here is the part that makes it run on every scroll. The controller listens for the scroll event and
            calls <code>adjustLocation</code> each time:
          </p>
          <CodeSnippet
            path="src/core/video-controller.js"
            startMatch="this.scrollListener = () => {"
            caption="A scroll listener. Every scroll, it asks to move the box again."
          />
          <p>This works. But it has two costs:</p>
          <ul>
            <li>
              It is a lot of work. The browser has to run our code many times a second while you scroll. That uses
              battery and can feel slow.
            </li>
            <li>
              Sometimes we pick the wrong spot, and the box jumps to a strange place. We are doing the math ourselves, so
              we can get it wrong.
            </li>
          </ul>
          <DemoFrame label="watch JavaScript do the work">
            <PositioningDemo />
          </DemoFrame>
          <p>
            In the box above, keep it on "JS observer" and scroll. The counter goes up fast, because JavaScript moves the
            pill on every single scroll step. Now switch to "CSS anchor" and scroll again: the counter stops going up,
            because JavaScript is doing nothing. The browser keeps the pill in place. That is the other way, and it is
            the rest of this lesson.
          </p>
        </>
      ),
    },
    {
      id: 'the-css-way',
      title: '3. The CSS way: let the browser do it',
      content: (
        <>
          <p>
            Browsers have a CSS feature called <strong>anchor positioning</strong>. It lets you say: "This element should
            stick to that other element." Then the browser keeps them together for you. You do not write any scroll
            code. The browser already knows where everything is, so it is fast and correct.
          </p>
          <p>You do it in two small steps:</p>
          <ul>
            <li>
              Give the video a name with <code>anchor-name</code>. Think of it like a name tag, for example{' '}
              <code>--vsc-anchor-1</code>.
            </li>
            <li>
              Tell the controller to use that name with <code>position-anchor</code>, and set its <code>top</code> and{' '}
              <code>left</code> to <code>anchor(top)</code> and <code>anchor(left)</code>. That means "put my top edge
              where the anchor's top edge is."
            </li>
          </ul>
          <Compare
            left={
              <>
                <strong>JavaScript way</strong>
                <p>We listen to scroll. We measure the video. We move the box. Over and over.</p>
              </>
            }
            right={
              <>
                <strong>CSS way</strong>
                <p>We connect the box to the video once. The browser keeps them together. We do nothing on scroll.</p>
              </>
            }
          />
        </>
      ),
    },
    {
      id: 'the-css-way-in-code',
      title: '4. The CSS way in the real code',
      content: (
        <>
          <p>
            Here is the real function that turns on anchor positioning. Read the comments. It gives the video a name,
            then glues the controller to that name:
          </p>
          <CodeSnippet
            path="src/ui/shadow-dom-manager.js"
            startMatch="enableAnchorPositioning(host) {"
            caption="Name the video, then glue the controller to it. No scroll code."
          />
          <Note title="Why we check CSS.supports first">
            Not every browser has anchor positioning. So before we use it, we ask the browser if it knows this feature.
            If it does not, the function returns <code>false</code> and the code keeps using the JavaScript way. Nothing
            breaks for those users.
          </Note>
        </>
      ),
    },
    {
      id: 'turning-the-other-way-off',
      title: '5. Letting the two ways live together',
      content: (
        <>
          <p>
            The JavaScript code was not deleted. It is made to skip its work when anchor mode is on. Look at the top of{' '}
            <code>adjustLocation</code>: if anchor positioning is on, it stops right away and does nothing. So the scroll
            listeners still run, but they have no work to do.
          </p>
          <CodeSnippet
            path="src/ui/shadow-dom-manager.js"
            startLine={255}
            endLine={261}
            caption="The guard at the top of adjustLocation: in anchor mode, do nothing."
          />
          <p>
            Which way is used is decided by a setting called <code>anchorPositioning</code>. You can read its current
            value in the code below. The point of this lesson is not which value it has today, but that both ways exist
            and the setting chooses between them.
          </p>
          <CodeSnippet
            path="src/shared/defaults.js"
            startMatch="anchorPositioning:"
            caption="The setting that chooses which positioning way is used."
          />
        </>
      ),
    },
    {
      id: 'shadow-dom-and-host',
      title: '6. Shadow DOM and the :host() word',
      content: (
        <>
          <p>
            There is one more piece. The controller is built inside a <strong>shadow DOM</strong>. A shadow DOM is like a
            small, private room inside an element. The styles inside that room do not leak out, and the page's styles do
            not leak in. VideoSpeed uses this so a website cannot mess up how the controller looks.
          </p>
          <p>
            The video sits <em>outside</em> this private room, on the normal page. So we put the name tag on the outside
            box, the <strong>host</strong>. The host is the element that holds the shadow room. From inside the room, CSS
            can look at the host using <code>:host(...)</code>.
          </p>
          <p>
            A class called <code>vsc-anchored</code> is added to the host when anchor mode is on. Then a rule inside the
            shadow room reacts to it:
          </p>
          <CodeSnippet
            path="src/styles/shadow_new.css"
            startMatch=":host(.vsc-anchored)"
            caption="Read this as: when the host has class vsc-anchored, change the pill inside the room."
          />
          <p>
            So <code>:host(.vsc-anchored) #vsc-controller</code> means: "Find the pill inside this room, but only do it
            when the outside host has the class <code>vsc-anchored</code>." This lets one class on the outside change how
            things look on the inside.
          </p>
          <DemoFrame label="see :host() work">
            <ShadowHostDemo />
          </DemoFrame>
          <p>
            The pill above really lives in a shadow DOM. The checkbox adds the class <code>anchored</code> to the outside
            box. The pill turns green because of a <code>:host(.anchored)</code> rule inside. This is the same trick the
            real code uses, just with a color instead of a position.
          </p>
        </>
      ),
    },
    {
      id: 'putting-it-together',
      title: '7. Putting it together',
      content: (
        <>
          <p>Here is the order of events when a video is found and anchor mode is on:</p>
          <Step n={1} title="Read the setting">
            The controller reads <code>anchorPositioning</code> from the settings. If it is off, it uses the JavaScript
            way and stops here.
          </Step>
          <Step n={2} title="Build the controller">
            It builds the shadow room and the pill, then puts the host on the page.
          </Step>
          <Step n={3} title="Turn on anchoring">
            It calls <code>enableAnchorPositioning</code>. If the browser supports it, it adds the{' '}
            <code>vsc-anchored</code> class and connects the pill to the video.
          </Step>
          <Step n={4} title="Do nothing on scroll">
            From now on, the browser keeps the pill on the video. <code>adjustLocation</code> runs but returns early.
          </Step>
          <CodeSnippet
            path="src/core/video-controller.js"
            startMatch="if (this.shadowManager.anchorPositioning) {"
            caption="The real glue in the controller: enable anchoring, and fall back to JS if it is not supported."
          />
        </>
      ),
    },
    {
      id: 'what-to-remember',
      title: '8. What to remember',
      content: (
        <ul>
          <li>The controller must stay on the video. That is the whole job.</li>
          <li>The JavaScript way moves it on every scroll. It works but is heavy and can be wrong.</li>
          <li>
            The CSS way uses anchor positioning. We name the video and glue the controller to it. The browser does the
            rest.
          </li>
          <li>
            The controller lives in a shadow DOM. <code>:host(.vsc-anchored)</code> lets a class on the outside change
            the inside.
          </li>
          <li>A setting chooses which way is used, so both can live in the code at once.</li>
        </ul>
      ),
    },
  ],
  faqs: [
    {
      question: 'Which element has position: fixed — the video or the controller?',
      answer: (
        <>
          <p>
            The controller. It is the one that moves to follow the other one, so it is the one that needs to be
            positioned. The video only gets the name tag (<code>anchor-name</code>); we do not change how the video is
            placed at all.
          </p>
          <p>
            A way to remember it: the thing that <em>follows</em> needs the position; the thing that <em>stays</em> just
            needs a name.
          </p>
        </>
      ),
    },
    {
      question: 'Does the controller have to use "fixed"? Would something else work?',
      answer: (
        <>
          <p>
            It does not have to be <code>fixed</code>. The rule is that the controller must be either{' '}
            <code>fixed</code> or <code>absolute</code>. Both let it use <code>anchor(top)</code> and{' '}
            <code>anchor(left)</code>. The other kinds (<code>static</code>, <code>relative</code>, <code>sticky</code>)
            do not work — the <code>anchor()</code> part is just ignored.
          </p>
          <p>
            We picked <code>fixed</code> for two reasons. First, the controller's own style sheet sets{' '}
            <code>absolute</code>, and writing <code>fixed</code> on the element wins over that, so we are sure it
            sticks. Second, <code>fixed</code> measures from the window, which is simple and steady for a box we put at
            the top of the page.
          </p>
        </>
      ),
    },
    {
      question: 'Can I put anchor-name on any element and stick any other element to it?',
      answer: (
        <>
          <p>Almost. There are three things to watch for.</p>
          <p>
            <strong>Same tree.</strong> The name and the element using the name must be in the same part of the page. A
            shadow DOM is its own private part, so an element inside the controller's shadow room cannot see the name on
            the video outside it. This is the reason we put the name link on the host (the outside box), not on the pill
            inside the room.
          </p>
          <p>
            <strong>The named element must be visible.</strong> It needs to take up space. If it is hidden with{' '}
            <code>display: none</code>, the name turns off, and the controller hides too.
          </p>
          <p>
            <strong>No loops.</strong> You cannot have two elements that each get their size or place from the other.
            The browser blocks that so it does not go in circles. Sticking our top-of-page box to a normal element on the
            page, like we do, is the safe and normal case.
          </p>
        </>
      ),
    },
  ],
};
