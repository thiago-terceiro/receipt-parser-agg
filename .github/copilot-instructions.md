# Copilot Instructions

- In React components, do not call local `setState` synchronously just to clear or mirror derived UI state inside `useEffect`.
- Prefer clearing state in the event handler that changes the input, deriving display state during render when practical, and using effects for subscriptions, async callbacks, or external-system synchronization.