# Voice Tuner Spec

## Purpose

The cyberdeck voice tuner is a control surface for shaping AI behavior and voice output through physical-feeling knobs.

It is not a simple audio panel.

It is a state morphing interface:

- knobs represent semantic axes
- curves shape how those axes feel
- presets define named regions in the control space
- the AI reads the current state and responds accordingly

This spec captures the rules for the tuner so the interaction can be rebuilt consistently across UI, voice, and future hardware.

## Design Goals

- Wheel-first interaction.
- Drag as a secondary tactile nudge.
- Direction should feel physically correct and easy to learn.
- The knob should behave like real tuning hardware, not a toy slider.
- The UI should support both numeric precision and lore-flavored naming.
- Controls must be reusable as component primitives.
- The system should allow state recall, preset markers, and live readouts.

## Interaction Rules

### Primary input

- Mouse wheel is the main control surface.
- Wheel direction must match user intuition.
- Wheel steps should be small enough for fine tuning.
- Wheel should feel immediate and consistent across all knobs.

### Secondary input

- Drag is allowed as a hands-on adjustment gesture.
- Drag should follow movement direction simply.
- Drag must not fight the wheel model.
- Drag should feel like a nudge, not a replacement for the wheel.

### Reset behavior

- Double-click resets a knob to its default value.
- Reset should always return to the knob's semantic center or chosen default.

## Control Model

Each knob should expose the same basic contract:

```ts
type KnobSemantic = {
  key: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  curve: "linear" | "log" | "exp" | "exp2" | "exp3" | "sCurve" | "invLog";
  unit?: string;
  snapPoints?: number[];
  readout?: (value: number) => string;
};
```

The raw knob position is normalized, then mapped through a curve to the actual parameter space.

## Curve Rules

Not every control should be linear.

### Linear

Use for controls where equal motion should feel equal.

Examples:

- tempo
- rate
- balance
- mix controls when the response is already natural

### Log

Use for controls where the low end needs more precision.

Examples:

- volume
- reverb
- room size
- damping
- presence

### Exp

Use for controls that should stay calm early and grow aggressively later.

Examples:

- distortion
- grit
- machine
- ash

### S-curve

Use when the middle of the range should feel especially usable.

Examples:

- signal clarity
- control blends
- mode transitions

### Inverse log

Use when the top end needs more precision than the bottom.

Examples:

- veil
- reduction
- softening

## Knob Set

The lore-flavored voice tuner set is:

- Mass
- Ritual
- Signal
- Machine
- Ash
- Veil
- Command
- Chamber

These names are preferred over plain studio labels because they match the cyberdeck language.

## Meaning of Each Knob

| Label | Meaning | Suggested Target | Curve |
| --- | --- | --- | --- |
| Mass | weight, body, heaviness | low shelf gain, low-mid body, formant depth | exp2 |
| Ritual | slowness, deliberation, pacing | speech rate, pause length | linear |
| Signal | clarity, radio narrowness, transmission focus | bandpass mix, telephone EQ, noise gate edge | sCurve |
| Machine | metallic synthetic edge | vocoder mix, ring mod blend, chorus-metal layer | exp3 |
| Ash | grit, burn, friction | saturation, distortion amount | exp3 |
| Veil | damping, muffling, distance | high cut, low pass, transient softening | log or invLog |
| Command | intelligibility and authority | presence boost, upper-mid EQ, compression | log |
| Chamber | room, space, system echo | reverb wet mix, room size | log |

## Preset Regions

The system should support named states, not just raw values.

Recommended presets:

- Operator
- Mechanicus
- Warp Spider

These are not hard locks. They are regions in parameter space.

### Example preset intent

- Operator: balanced, readable, neutral
- Mechanicus: heavier, ceremonial, machine-forward
- Warp Spider: faster, sharper, more agile

## Readout Rules

Every knob should have a live readout.

Examples:

- `+12 grit`
- `0.72 ritual`
- `18 chamber`
- `+3 mass`

Readouts should be compact and informative.

## Preset Markers

Knobs may show markers for important points in their range.

Examples:

- default
- operator zone
- mechanicus zone
- warp spider zone

Markers should help the user find useful states quickly without removing precision.

## State Schema

The current control state should be serializable.

```ts
type VoiceTunerState = {
  mass: number;
  ritual: number;
  signal: number;
  machine: number;
  ash: number;
  veil: number;
  command: number;
  chamber: number;
};
```

This state can be:

- saved to disk
- used to restore the UI
- sent to a voice backend
- used as a seed for AI behavior

## AI Behavior Link

The AI should treat the current tuner state as part of its context.

That means:

- the state influences voice output
- the state influences response style
- the state can influence summary or narration
- the state can be shown in debug panels

This is the bridge from UI knobs to the AI being "alive".

## AiUi Relationship

AiUi is the rendering idea on top of the control surface.

For this project:

- React components are the real UI
- the AI streams into those components
- the tuner state changes what the AI composes
- the visual result can feel like the AI is generating interface live

The tuner is therefore a shared primitive for:

- voice
- personality
- interface composition
- future cyberdeck modes

## Implementation Notes

- Keep the knob component reusable.
- Keep curve mapping in a utility, not in the component body.
- Keep the semantic mapping table near the voice layer.
- Keep presets separate from raw values.
- Keep the UI honest about the current state.
- Do not collapse the whole system into one-off hardcoded logic.

## Non-Goals

- This is not a generic audio plugin spec.
- This is not a monolithic rewrite.
- This is not a requirement that every project use the same controls.
- This is not a promise that the hardware exists yet.

## Summary

The cyberdeck voice tuner is a semantic control grammar for shaping AI output.

The knobs are not just controls.
They are state transformers.

The curves make them feel like hardware.
The labels give them meaning.
The presets give them identity.
The AI gives them life.
