/\*\*

- Form and Filter typing patterns — P2/11 refactor
-
- This guide shows how to replace generic `Record<string, string>` with strict form schemas.
  \*/

// ============================================================================
// BEFORE: Generic record types with weak type safety
// ============================================================================

// ❌ Old pattern — loses type information
type OldUsage = {
const [filters, setFilters] = useState<Record<string, string>>({});
const handleChange = (f: Record<string, string>) => { /_ no type hints _/ };
};

// ============================================================================
// AFTER: Strict schema types with strong type safety
// ============================================================================

// ✅ New pattern — explicit schema definition

// Define what fields your form/filter should contain:
import type { FilterSchema, FormSchema, SchemaKeys } from "@/lib/forms/types";

// Example 1: FilterBar with typed schema
type ContractFilters = FilterSchema<"status" | "priority" | "search">;

function MyFilterExample() {
// Type-safe filter callback
const handleFilterChangeAction = (filters: ContractFilters) => {
// ✅ TypeScript knows these keys exist
console.log(filters.status, filters.priority, filters.search);
// ❌ TypeScript error: filters.invalid_field does not exist
};

return (
<FilterBar<ContractFilters>
fields={[
{ key: "status", label: "Status", type: "select", options: [...] },
{ key: "priority", label: "Priority", type: "select", options: [...] },
{ key: "search", label: "Search", type: "text", placeholder: "..." },
]}
onChangeAction={handleFilterChangeAction}
/>
);
}

// Example 2: FormBuilder with typed schema
type TenantForm = FormSchema<"name" | "description" | "status">;

function MyFormExample() {
const handleSubmit = async (values: TenantForm) => {
// ✅ Type-safe field access
const response = await api.createTenant({
name: values.name,
description: values.description,
status: values.status,
});
// ❌ TypeScript error: values.invalid_field does not exist
};

return (
<FormBuilder<TenantForm>
fields={[
{ key: "name", label: "Tenant Name", type: "text", required: true },
{ key: "description", label: "Description", type: "textarea" },
{ key: "status", label: "Status", type: "select", options: [...] },
]}
onSubmitAction={handleSubmit}
/>
);
}

// Example 3: Hook usage with typed schemas
import type { useFilterState } from "@/hooks/useFilterState"; // hypothetical

function MyPageExample() {
type PageFilters = FilterSchema<"status" | "assignee" | "date_range">;

const [filters, setFilters] = useFilterState<PageFilters>({
status: "open",
assignee: "",
date_range: "",
});

// ✅ All filter keys are type-checked
const handleStatusChange = (status: string) => {
setFilters((prev) => ({ ...prev, status }));
};

return <FilterBar<PageFilters> ... />;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

import {
initializeFormValues,
mergeFormValues,
type SchemaKeys,
} from "@/lib/forms/types";

// Helper to initialize all form fields at once:
type UserCreateForm = FormSchema<"email" | "name" | "role">;

function UserCreatePage() {
// ✅ Safely create default values
const defaults = initializeFormValues<UserCreateForm>(["email", "name", "role"]);
// Result: { email: '', name: '', role: '' }

// ✅ Safely merge overrides
const withInitial = mergeFormValues(defaults, {
role: "user", // only these keys are allowed
});

return <FormBuilder<UserCreateForm> initialValues={withInitial} ... />;
}

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/\*

1. Identify all FilterBar usages:
   - [ ] app/tenants/page.tsx
   - [ ] app/contracts/page.tsx
   - [ ] app/assets/page.tsx
   - [ ] app/incidents/page.tsx
   - [ ] app/employees/page.tsx
   - [ ] app/shifts/page.tsx
   - [ ] app/time-off/page.tsx
   - [ ] app/departments/page.tsx

2. For each page, define a FilterSchema type:

   ```
   type PageFilters = FilterSchema<'status' | 'search' | ...>;
   ```

3. Update FilterBar usage:

   ```
   <FilterBar<PageFilters>
     fields={fields}
     onChange={setFilters}
   />
   ```

4. Identify all FormBuilder usages:
   - [ ] components/\*/FormModal.tsx
   - [ ] components/\*/EditModal.tsx
   - [ ] Create pages

5. For each form, define a FormSchema type:

   ```
   type TenantForm = FormSchema<'name' | 'description'>;
   ```

6. Update FormBuilder usage:

   ```
   <FormBuilder<TenantForm>
     fields={fields}
     onSubmitAction={handleSubmit}
   />
   ```

7. Run npm run lint and npm run test to verify.

8. (Optional) Migrate to react-hook-form + zod for complex forms:
   - Identify forms with custom validation
   - Identify forms with interdependent fields
   - Create zod schemas alongside FormSchema types
     \*/

// ============================================================================
// BENEFITS
// ============================================================================

/\*
✅ Type Safety

- Form field keys are validated at compile time
- No more `as Record<string, string>` casts
- IDE autocomplete for form values

✅ Maintainability

- Field schema is explicitly defined
- Form structure is self-documenting
- Easier to refactor form fields

✅ Runtime Safety

- Filters and forms require all expected fields
- Catching missing fields earlier in development
- Better TypeScript strictness

✅ Integration Paths

- Can gradually migrate to react-hook-form for complex forms
- Works alongside existing patterns
- No breaking changes to existing components
  \*/
