# Form UX with React Hook Form + Zod

## Structure

```
src/features/orders/
  lib/orderFormSchema.ts       # form Zod schema + inferred type (API schemas live in api/order.schemas.ts)
  api/order.mutations.ts       # useCreateOrder (useMutation)
  components/OrderForm.tsx     # form UI (≤150 lines; split sections into components)
```

```ts
// lib/orderFormSchema.ts
export const orderFormSchema = z.object({
  email: z.email({ error: 'orders.form.email.invalid' }),       // i18n keys, translated in <FieldError>
  quantity: z.coerce.number().int().min(1, { error: 'orders.form.quantity.min' }),
  comment: z.string().max(500).optional(),
})
export type OrderFormValues = z.infer<typeof orderFormSchema>
```

Store i18n **keys** (or use a Zod error map wired to i18n) so messages are translatable. The pack uses Zod 4 syntax (`z.email()`, `{ error }`).

## Validation timing

| Mode | Use |
|---|---|
| `onTouched` (**default for Mdigital**) | first check on blur, then on every change - fixes disappear as the user types |
| `onSubmit` | very short forms (login, 1-2 fields) |
| `onChange` | only for live-feedback fields like password strength (prefer a separate hint, not errors) |

Never show "required" errors before the user has interacted with the field or tried to submit.

## Submit handling

```tsx
const createOrder = useCreateOrder() // useMutation with meta: { skipGlobalErrorToast: true }

function onSubmit(values: OrderFormValues) {
  createOrder.mutate(values, {
    onSuccess: (order) => {
      toast.success(t('orders.created'))
      navigate({ to: '/orders/$id', params: { id: order.id } })
    },
    onError: (error) => applyServerErrors(error, form.setError, orderFormSchema.keyof().options), // fields first, else root.server
  })
}
```

Use `mutateAsync` (inside `try/catch`) only when awaiting is truly needed, e.g. sequential steps.

`applyServerErrors` lives in `src/shared/lib/applyServerErrors.ts`; canonical code in `react-error-handling` [api-errors.md](../../react-error-handling/references/api-errors.md) (focuses the first matched field).

Render `form.formState.errors.root?.server` above the submit button inside `role="alert"`.

## Submit button

- Enabled while invalid: clicking reveals errors and focuses the first one. A disabled button gives no reason why.
- Disabled only while `mutation.isPending`; keep width stable, show spinner + "Saving...".
- The disabled state (`isPending`) is the guarantee against double submit. For non-idempotent payments also send an idempotency key.

## Preserving input

- Never `reset()` on error. Reset only after success (or navigate away).
- Dirty-guard: TanStack Router `useBlocker({ shouldBlockFn: () => form.formState.isDirty && !isSubmitted })`; Next.js: `beforeunload` listener for tab close plus confirm on in-app links.
- Long or multi-step forms: persist draft to `sessionStorage` (debounced) and restore on mount; clear after success.
- Multi-step: validate the current step with `form.trigger(stepFields)` before moving on; keep all steps in one `useForm`; put the step in the URL.

## Field rules

- Visible `<label>` always; placeholder only for an example format.
- Hints under the label explain format before the user errs ("DD.MM.YYYY").
- Use `type="email" | "tel" | "number"`, `inputMode`, `autoComplete` (`email`, `tel`, `given-name`, `one-time-code`).
- Don't split one value into many inputs (phone, card) unless a mask library is in use.
- Build fields with shadcn `Field` + `FieldLabel` + `FieldError` and RHF `Controller` (the old `Form`/`FormField`/`FormMessage` wrappers are retired). Set `aria-invalid` on the control and `data-invalid` on `Field`; group related fields in `FieldGroup`/`FieldSet`.
- Choose controls for the data: ≤5 options → radio group; more → select/combobox.
- Don't make users re-enter known data; prefill from profile/previous values.

## Next.js server actions

When a form posts to a server action instead of an API:
- Validate with the same Zod schema on client (RHF) and server (`safeParse`).
- `useActionState(action, initialState)` returns `[state, formAction, isPending]`; return `{ fieldErrors, message }` from the action and push them into RHF with `setError`.
- `useFormStatus()` must be called in a component rendered **inside** the `<form>` (e.g. a `SubmitButton`).
