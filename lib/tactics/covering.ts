export type CoveringMode = "upwind" | "downwind";

export type CoveringScenario = {
  title: string;
  situation: string;
  move: string;
  watchOut: string;
};

export type CoveringGuide = {
  mode: CoveringMode;
  title: string;
  principle: string;
  quickRule: string;
  scenarios: CoveringScenario[];
  calls: string[];
  mistakes: string[];
};

export const coveringGuides: CoveringGuide[] = [
  {
    mode: "upwind",
    title: "Upwind Cover",
    principle:
      "Protect the side, lane, or shift that matters most while keeping your boat fast. A cover is useful only if it keeps you between the threat and the next advantage.",
    quickRule:
      "Loose cover when you are managing the fleet or protecting a side. Tight cover when one boat is the real threat and you can afford to slow them down.",
    scenarios: [
      {
        title: "You are ahead and the boat behind tacks away",
        situation:
          "They are trying to split for clear air or a private shift.",
        move:
          "Tack soon enough to stay between them and the weather mark, but leave a small lane so you keep speed.",
        watchOut:
          "Do not tack only because they tacked. If they are going toward the bad side, protect the favored side instead.",
      },
      {
        title: "A boat is close on your hip",
        situation:
          "They are trying to live in your wind shadow or force you to tack first.",
        move:
          "Sail your mode cleanly, then tack when you can cross or when your lane starts to shrink.",
        watchOut:
          "Pinching to hold them down usually costs both speed and options.",
      },
      {
        title: "You need to defend starboard/right side",
        situation:
          "The right side has pressure, current relief, or a persistent shift.",
        move:
          "Use a loose cover that keeps threats from owning the right while you still sail the lifted tack.",
        watchOut:
          "A perfect tactical cover is not worth sailing into less wind or worse current.",
      },
      {
        title: "You are leading a small pack",
        situation:
          "Several boats are close enough to pass if you let them split.",
        move:
          "Cover the group, not one boat. Stay in phase and keep your bow pointed toward the next mark.",
        watchOut:
          "Over-covering one boat can hand the rest of the pack a free lane.",
      },
    ],
    calls: [
      "Who is the threat?",
      "Protect the side",
      "Loose cover",
      "Tight cover",
      "Hold the lane",
      "Tack with them",
      "Let them go",
    ],
    mistakes: [
      "Tacking on every move behind you instead of protecting the favored side.",
      "Sailing slow in a tight cover when a loose cover would defend just as well.",
      "Pinching to block a boat and losing the lane yourself.",
      "Covering one boat so hard that the fleet passes on the other side.",
    ],
  },
  {
    mode: "downwind",
    title: "Downwind Cover",
    principle:
      "Stay between the threat and the next mark while protecting clean air, inside position, and the better pressure lane.",
    quickRule:
      "Defend the passing lane first. Use your wind shadow when it helps, but do not sail extra distance just to sit on someone.",
    scenarios: [
      {
        title: "A boat tries to roll you to windward",
        situation:
          "They are heating up with more pressure and trying to blanket or pass over the top.",
        move:
          "Head up enough to keep flow and protect your lane, then settle back down once they stop gaining.",
        watchOut:
          "Do not get dragged high for too long. If the mark is low, distance lost can be worse than the pass.",
      },
      {
        title: "A boat splits gybes behind you",
        situation:
          "They are looking for pressure, a better angle, or a lane to the inside.",
        move:
          "Gybe if needed to stay between them and the mark, especially when they are the main threat.",
        watchOut:
          "If the split goes toward less pressure or bad current, hold the better lane and let them go.",
      },
      {
        title: "You are ahead at the weather mark",
        situation:
          "Boats behind may choose different gybe angles to escape your air.",
        move:
          "Exit clean, get the spinnaker drawing, then decide whether to match the first serious split.",
        watchOut:
          "Covering before your kite is stable can cost more than it saves.",
      },
      {
        title: "You are leading into the leeward mark",
        situation:
          "The main threat wants inside overlap or a cleaner rounding lane.",
        move:
          "Position between them and the mark early, then choose the rounding that protects the next upwind lane.",
        watchOut:
          "Do not soak too low and lose speed if it gives the boat behind room to roll over you.",
      },
    ],
    calls: [
      "Who can pass us?",
      "Protect inside",
      "Hold this lane",
      "Match the gybe",
      "Let them split",
      "Heat to defend",
      "Soak when clear",
    ],
    mistakes: [
      "Sailing too high to cover and giving away distance to the mark.",
      "Letting a close boat own the inside lane before the leeward mark.",
      "Blanketing someone so aggressively that your own spinnaker loses flow.",
      "Gybing only because they gybed, even when they went toward worse pressure.",
      "Forgetting the next leg and rounding in a weak exit lane.",
    ],
  },
];

export const coveringPrinciples = [
  "Identify the real threat before reacting.",
  "Protect the next advantage: side, lane, pressure, current, or mark room.",
  "Use the lightest cover that still controls the pass.",
  "Keep the boat fast enough that the cover does not become self-sabotage.",
  "When the threat goes toward the wrong side, let them go and keep the winning water.",
];
