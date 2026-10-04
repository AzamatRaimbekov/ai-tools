# Sources

Checked October 2026.

## Perceived performance and loading
- Nielsen, J. "Response Times: The 3 Important Limits" (NN/g, 1993, updated 2014) - 0.1 s / 1 s / 10 s thresholds. https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g "Skeleton Screens 101" (2023, reviewed Sep 2026) - skeleton vs spinner vs progress bar; skip indicators under 1 s; avoid frame-only skeletons. https://www.nngroup.com/articles/skeleton-screens/
- web.dev "Interaction to Next Paint (INP)" (updated Sep 2025) - good ≤ 200 ms, poor > 500 ms. https://web.dev/articles/inp
- web.dev "Cumulative Layout Shift (CLS)" - good ≤ 0.1. https://web.dev/articles/cls

## React and TanStack Query
- react.dev `useOptimistic` - setter must run inside an Action/`startTransition`; reverts on failure. https://react.dev/reference/react/useOptimistic
- react.dev `useActionState` - `[state, dispatchAction, isPending]`. https://react.dev/reference/react/useActionState
- react.dev `useFormStatus`. https://react.dev/reference/react-dom/hooks/useFormStatus
- react.dev `useTransition` / `Suspense` - transitions keep revealed content instead of showing fallbacks. https://react.dev/reference/react/useTransition , https://react.dev/reference/react/Suspense
- TanStack Query "Paginated Queries" - `placeholderData: keepPreviousData`, `isPlaceholderData`. https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries
- TanStack Query "Optimistic Updates" - via variables vs via cache. https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- TanStack Router "Search Params" - `validateSearch`, search middlewares. https://tanstack.com/router/latest/docs/framework/react/guide/search-params
- nuqs - type-safe URL state; adapters for Next.js, React Router, TanStack Router. https://nuqs.dev/

## Forms
- NN/g "10 Design Guidelines for Reporting Errors in Forms" - inline, adjacent, after field completion, summaries not alone. https://www.nngroup.com/articles/errors-forms-design-guidelines/
- React Hook Form `useForm` - `mode`, `reValidateMode`, `shouldFocusError`, `setError`. https://react-hook-form.com/docs/useform
- shadcn/ui Form (RHF + Zod integration, aria wiring). https://ui.shadcn.com/docs/components/form

## Feedback and destructive actions
- NN/g "Confirmation Dialogs Can Prevent User Errors (If Not Overused)" (2018, reviewed Aug 2026) - specific copy, action-labelled buttons, undo as safety net. https://www.nngroup.com/articles/confirmation-dialog/
- NN/g "Designing Empty States in Complex Applications" (2021) - status, learning cues, direct task pathways. https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g "Indicators, Validations, and Notifications". https://www.nngroup.com/articles/indicators-validations-notifications/
- sonner docs. https://sonner.emilkowal.ski/

## Accessibility
- WCAG 2.2 Understanding SC 4.1.3 Status Messages. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- WCAG 2.2 What's new (2.4.11 Focus Not Obscured, 2.5.7 Dragging, 2.5.8 Target Size, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication). https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- MDN `prefers-reduced-motion`. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
