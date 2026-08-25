# GitHub Issues for Accessibility Audit Findings

This document contains formatted GitHub issues for all critical and major findings from the WCAG 2.1 Level AA accessibility audit. Each issue can be copied directly into GitHub.

---

## Critical Issues

### Issue #1: Add Skip Navigation Links

**Title:** [A11Y Critical] Add skip navigation links for keyboard users

**Labels:** accessibility, critical, WCAG-2.1, keyboard-navigation

**Priority:** High

**Description:**
The application lacks "skip to main content" links at the top of the page. Keyboard users must tab through all navigation elements on every page load, violating WCAG 2.4.1 Bypass Blocks.

**WCAG Criteria:** 2.4.1 Bypass Blocks (Level A)

**Impact:** Keyboard users must navigate through entire navigation menu on each page load

**Files Affected:**

- `app/layout.tsx`

**Recommended Fix:**
Add skip link after `<html>` tag:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded"
>
  Skip to main content
</a>
```

Add `id="main-content"` to main content wrapper in each page.

**Acceptance Criteria:**

- [ ] Skip link appears on page load
- [ ] Skip link is hidden until focused
- [ ] Skip link jumps to main content when activated
- [ ] Skip link works on all pages
- [ ] Focus moves to main content after skip

---

### Issue #2: Fix Carousel Keyboard Navigation

**Title:** [A11Y Critical] Fix keyboard navigation in carousel components

**Labels:** accessibility, critical, WCAG-2.1, keyboard-navigation

**Priority:** High

**Description:**
Carousel components lack proper keyboard navigation. Carousel items are not keyboard focusable, and there are no keyboard shortcuts for carousel navigation.

**WCAG Criteria:** 2.1.1 Keyboard (Level A), 2.4.3 Focus Order (Level A)

**Impact:** Keyboard users cannot navigate carousel content effectively

**Files Affected:**

- `components/MyAlbums.tsx`
- `components/common/home/Discover.tsx`

**Recommended Fix:**
Make carousel items focusable and add keyboard event handlers:

```tsx
<div
  className="flex-shrink-0 w-48 group relative"
  tabIndex={0}
  role="group"
  aria-label={`Album: ${album.title}`}
>
  {/* Album content */}
</div>;

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "ArrowLeft") scrollLeft();
  if (e.key === "ArrowRight") scrollRight();
};
```

**Acceptance Criteria:**

- [ ] Carousel items are keyboard focusable
- [ ] Arrow keys navigate carousel
- [ ] Focus order is logical
- [ ] Screen readers announce carousel items
- [ ] Navigation buttons have proper ARIA labels

---

### Issue #3: Implement Modal Focus Trapping

**Title:** [A11Y Critical] Implement proper focus trapping in modal dialogs

**Labels:** accessibility, critical, WCAG-2.1, focus-management

**Priority:** High

**Description:**
Custom modal implementations lack proper focus trapping. Focus can escape the modal when using Tab/Shift+Tab, and focus is not returned to the triggering element after modal close.

**WCAG Criteria:** 2.4.3 Focus Order (Level A), 3.2.1 On Focus (Level A)

**Impact:** Keyboard users lose context when focus escapes modals

**Files Affected:**

- `components/MerchesContent.tsx`
- `components/common/modals/`

**Recommended Fix:**
Implement focus trap using useRef and useEffect:

```tsx
useEffect(() => {
  if (isOpen) {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    firstElement?.focus();
  }
}, [isOpen]);

// Add event listener for Tab/Shift+Tab to trap focus
```

**Acceptance Criteria:**

- [ ] Focus is trapped inside modal when open
- [ ] Focus moves to first focusable element on open
- [ ] Focus returns to trigger element on close
- [ ] Tab/Shift+Tab cycles through modal elements
- [ ] Escape key closes modal

---

## Major Issues

### Issue #4: Fix Empty Alt Text on Logo

**Title:** [A11Y Major] Fix empty alt text on footer logo

**Labels:** accessibility, major, WCAG-2.1, images

**Priority:** High

**Description:**
The footer logo has empty alt text, preventing screen reader users from identifying the brand.

**WCAG Criteria:** 1.1.1 Non-text Content (Level A)

**Impact:** Screen reader users cannot identify the brand logo

**Files Affected:**

- `layouts/footer/index.tsx` line 12

**Recommended Fix:**

```tsx
<Image src="/logo.png" alt="AudioBlocks Logo" height={90} width={90} />
```

**Acceptance Criteria:**

- [ ] Logo has descriptive alt text
- [ ] Alt text is announced by screen readers
- [ ] Logo is properly identified as brand

---

### Issue #5: Fix Generic Alt Text on Feature Images

**Title:** [A11Y Major] Replace generic alt text on feature images

**Labels:** accessibility, major, WCAG-2.1, images

**Priority:** High

**Description:**
All feature images use generic `alt="image"` instead of descriptive text, providing no meaningful information to screen reader users.

**WCAG Criteria:** 1.1.1 Non-text Content (Level A)

**Impact:** Screen reader users get no meaningful information about feature images

**Files Affected:**

- `components/common/home/Featured.tsx` line 48

**Recommended Fix:**

```tsx
<Image
  width={900}
  height={900}
  className="object-cover w-full h-full rounded-t-2xl"
  loading="lazy"
  src={feature.image}
  alt={`${feature.title} - ${feature.description}`}
/>
```

**Acceptance Criteria:**

- [ ] All feature images have descriptive alt text
- [ ] Alt text includes feature title and description
- [ ] Screen readers announce meaningful image descriptions

---

### Issue #6: Add ARIA Labels to Icon-Only Buttons

**Title:** [A11Y Major] Add ARIA labels to carousel navigation buttons

**Labels:** accessibility, major, WCAG-2.1, aria

**Priority:** High

**Description:**
Carousel navigation buttons with only icons lack `aria-label`, making them inaccessible to screen reader users.

**WCAG Criteria:** 2.4.4 Link Purpose (Level A), 4.1.2 Name, Role, Value (Level A)

**Impact:** Screen reader users cannot understand button purpose

**Files Affected:**

- `components/common/home/Discover.tsx` lines 82-93

**Recommended Fix:**

```tsx
<button onClick={() => sliderRef.current?.slickPrev()} aria-label="Previous slide">
  <ArrowLeft className="w-5 h-5" />
</button>
```

**Acceptance Criteria:**

- [ ] All icon-only buttons have aria-label
- [ ] Labels describe button function clearly
- [ ] Screen readers announce button purpose

---

### Issue #7: Add ARIA Attributes to Category Tabs

**Title:** [A11Y Major] Add proper ARIA attributes to category tabs

**Labels:** accessibility, major, WCAG-2.1, aria

**Priority:** High

**Description:**
Category tabs function as tablist but lack proper ARIA attributes, making them inaccessible to screen reader users.

**WCAG Criteria:** 4.1.2 Name, Role, Value (Level A)

**Impact:** Screen reader users cannot understand tab interface

**Files Affected:**

- `components/common/home/Discover.tsx` lines 67-79

**Recommended Fix:**

```tsx
<div role="tablist" aria-label="Music categories">
  {categories.map((cat) => (
    <button
      key={cat}
      role="tab"
      aria-selected={activeTab === cat}
      aria-controls={`${cat}-panel`}
      onClick={() => setActiveTab(cat)}
    >
      {cat}
    </button>
  ))}
</div>

<div id={`${activeTab}-panel`} role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
  {/* Carousel content */}
</div>
```

**Acceptance Criteria:**

- [ ] Tablist has role="tablist"
- [ ] Tabs have role="tab"
- [ ] Active tab has aria-selected="true"
- [ ] Tabs link to panels via aria-controls
- [ ] Panels have role="tabpanel"

---

### Issue #8: Add Accessible Names to Social Media Links

**Title:** [A11Y Major] Add accessible names to social media links

**Labels:** accessibility, major, WCAG-2.1, links

**Priority:** High

**Description:**
Social media links have no text alternatives, causing screen readers to announce only "link" without platform name.

**WCAG Criteria:** 2.4.4 Link Purpose (Level A)

**Impact:** Screen reader users cannot identify social media platforms

**Files Affected:**

- `layouts/footer/index.tsx` lines 66-80

**Recommended Fix:**

```tsx
<Link href="#" className="hover:text-white" aria-label="Follow us on YouTube">
  <FaYoutube aria-hidden="true" />
</Link>
```

**Acceptance Criteria:**

- [ ] All social media links have aria-label
- [ ] Labels include platform names
- [ ] Icons marked with aria-hidden="true"
- [ ] Screen readers announce platform names

---

### Issue #9: Add Required Field Indicators

**Title:** [A11Y Major] Add required field indicators to forms

**Labels:** accessibility, major, WCAG-2.1, forms

**Priority:** High

**Description:**
Required fields in signup form lack visual and programmatic required indicators, preventing screen reader users from identifying required fields.

**WCAG Criteria:** 3.3.2 Labels or Instructions (Level A)

**Impact:** Screen reader users cannot identify required fields

**Files Affected:**

- `app/signup/page.tsx` lines 52-70

**Recommended Fix:**

```tsx
<label htmlFor="signup-email" className="text-sm font-medium text-white mb-2">
  Email <span className="text-red-500" aria-hidden="true">*</span>
</label>
<input
  id="signup-email"
  type="email"
  {...register("email", { required: "Email is required" })}
  aria-required="true"
  // ... other props
/>
```

**Acceptance Criteria:**

- [ ] Required fields have visual asterisk
- [ ] Required fields have aria-required="true"
- [ ] Screen readers announce required status
- [ ] Visual indicator is colorblind-friendly

---

### Issue #10: Fix Error Association in Signup Form

**Title:** [A11Y Major] Fix error message association in signup form

**Labels:** accessibility, major, WCAG-2.1, forms Validation

**Priority:** High

**Description:**
Email field error lacks `aria-describedby` association, preventing screen readers from announcing error messages.

**WCAG Criteria:** 3.3.1 Error Identification (Level A)

**Impact:** Screen reader users may not hear error messages

**Files Affected:**

- `app/signup/page.tsx` lines 73-87

**Recommended Fix:**

```tsx
<input
  id="signup-email"
  type="email"
  {...register("email", { required: "Email is required" })}
  aria-invalid={errors.email ? "true" : "false"}
  aria-describedby={errors.email ? "signup-email-error" : undefined}
  // ... other props
/>;
{
  errors.email && (
    <span id="signup-email-error" role="alert" className="text-xs text-red-500 mt-1">
      {errors.email.message}
    </span>
  );
}
```

**Acceptance Criteria:**

- [ ] Error messages have unique IDs
- [ ] Inputs reference error IDs via aria-describedby
- [ ] aria-invalid set correctly on errors
- [ ] Screen readers announce errors

---

### Issue #11: Fix Color Contrast on Placeholder Text

**Title:** [A11Y Major] Fix color contrast on placeholder text

**Labels:** accessibility, major, WCAG-2.1, color-contrast

**Priority:** High

**Description:**
Placeholder text color `#6F6F6F` on `#161616` background has contrast ratio of ~2.8:1, below WCAG AA minimum of 4.5:1.

**WCAG Criteria:** 1.4.3 Contrast (Minimum) (Level AA)

**Impact:** Low vision users cannot read placeholder text

**Files Affected:**

- Multiple components using placeholder text

**Recommended Fix:**

```css
/* Update placeholder color to meet AA standards */
.placeholder: text-[#9CA3AF]; /* #9CA3AF on #161616 = ~5.2:1 */
```

**Acceptance Criteria:**

- [ ] Placeholder text meets 4.5:1 contrast ratio
- [ ] Contrast verified with contrast checker
- [ ] All placeholder text updated consistently

---

### Issue #12: Add Visible Focus Styles

**Title:** [A11Y Major] Add visible focus styles to interactive elements

**Labels:** accessibility, major, WCAG-2.1, focus-visible

**Priority:** High

**Description:**
Many interactive elements lack visible focus indicators, relying only on browser defaults which may be subtle.

**WCAG Criteria:** 2.4.7 Focus Visible (Level AA)

**Impact:** Keyboard users cannot see which element has focus

**Files Affected:**

- Multiple components with interactive elements

**Recommended Fix:**

```css
/* Add to globals.css */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Or component-specific */
button:focus-visible {
  ring: 2px;
  ring-color: var(--color-primary);
}
```

**Acceptance Criteria:**

- [ ] All interactive elements have visible focus
- [ ] Focus indicator is at least 2px
- [ ] Focus indicator has good contrast
- [ ] Focus styles are consistent

---

### Issue #13: Replace Native Alert with Accessible Dialog

**Title:** [A11Y Major] Replace native alert() with accessible dialog

**Labels:** accessibility, major, WCAG-2.1, dialogs

**Priority:** High

**Description:**
The hero component uses native `alert()` which is not accessible to screen readers, blocks all interaction, and breaks focus management.

**WCAG Criteria:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)

**Impact:** Breaks screen reader focus and provides poor accessibility

**Files Affected:**

- `components/common/artist-hub/ArtistHubHero.tsx` line 30

**Recommended Fix:**
Replace with accessible toast notification or modal dialog using Radix UI Dialog or similar accessible component library.

**Acceptance Criteria:**

- [ ] Native alert() removed
- [ ] Accessible dialog/toast implemented
- [ ] Focus management implemented
- [ ] Screen reader compatible
- [ ] Keyboard accessible

---

### Issue #14: Fix Heading Hierarchy

**Title:** [A11Y Major] Fix heading hierarchy in Discover component

**Labels:** accessibility, major, WCAG-2.1, semantics

**Priority:** High

**Description:**
The Discover component uses `<h1>` for section heading when page already has an `<h1>` in Hero component, breaking heading hierarchy.

**WCAG Criteria:** 1.3.1 Info and Relationships (Level A)

**Impact:** Screen reader users cannot understand content structure

**Files Affected:**

- `components/common/home/Discover.tsx` line 55

**Recommended Fix:**

```tsx
<h2 className="text-4xl font-semibold text-[#A3A3A3] font-poppins leading-tight tracking-tight">
  Buy, Sell <span className="text-white">& Discover</span> Tracks
</h2>
```

**Acceptance Criteria:**

- [ ] Heading hierarchy is logical
- [ ] Only one h1 per page
- [ ] Headings properly nested
- [ ] Screen readers announce structure correctly

---

### Issue #15: Add Fieldset and Legend for Radio Groups

**Title:** [A11Y Major] Ensure radio button groups use fieldset and legend

**Labels:** accessibility, major, WCAG-2.1, forms

**Priority:** High

**Description:**
If radio button groups exist in the application, they must use `<fieldset>` and `<legend>` for proper accessibility.

**WCAG Criteria:** 1.3.1 Info and Relationships (Level A)

**Impact:** Screen reader users cannot understand radio button relationships

**Files Affected:**

- Any components with radio button groups (if added)

**Recommended Fix:**

```tsx
<fieldset>
  <legend>Choose your plan:</legend>
  <label>
    <input type="radio" name="plan" value="free" />
    Free
  </label>
  <label>
    <input type="radio" name="plan" value="premium" />
    Premium
  </label>
</fieldset>
```

**Acceptance Criteria:**

- [ ] Radio groups wrapped in fieldset
- [ ] Group description in legend
- [ ] Screen readers announce group context
- [ ] All radio groups compliant

---

## Testing Verification

After implementing fixes, verify with:

### Automated Testing

- [ ] Run axe-core on all pages
- [ ] Run axe-core on all components
- [ ] Verify no new violations introduced

### Manual Keyboard Testing

- [ ] Test all pages with Tab navigation
- [ ] Test all forms with keyboard only
- [ ] Test carousel navigation with keyboard
- [ ] Test modal focus trapping
- [ ] Test focus order matches visual order

### Manual Screen Reader Testing

- [ ] Test NVDA on Windows
- [ ] Test VoiceOver on macOS
- [ ] Test forms with screen reader
- [ ] Test dynamic content announcements
- [ ] Test carousel navigation

### Visual Testing

- [ ] Test with Windows High Contrast mode
- [ ] Test with browser zoom (200%)
- [ ] Test color contrast with contrast checker
- [ ] Test with forced colors mode

---

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://www.deque.com/axe/)
- [React Accessibility Guide](https://react.dev/learn/accessibility)
