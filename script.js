/* =============================================
   SERICA Care — script.js
   Pre-Launch Edition — Early Access Form
   ============================================= */

'use strict';

/* =============================================
   NAVBAR — scroll state
   ============================================= */
const navbar = document.getElementById('navbar');

function handleNavbarScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });
handleNavbarScroll();


/* =============================================
   MOBILE NAV — premium overlay with
   aria management, focus trap, stagger, Escape
   ============================================= */
const navToggle     = document.getElementById('navToggle');
const navLinks      = document.getElementById('navLinks');
const navMobileClose = document.getElementById('navMobileClose');

/* All focusable items inside the overlay */
function getNavFocusable() {
  return Array.from(
    navLinks.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

/* Stagger animation: add .nav-link-visible to links, CTA, tagline */
function animateNavIn() {
  const items = [
    ...navLinks.querySelectorAll('.nav-links-list a'),
    navLinks.querySelector('.nav-mobile-cta-wrap'),
    navLinks.querySelector('.nav-mobile-tagline'),
  ].filter(Boolean);

  items.forEach((el, i) => {
    setTimeout(() => el.classList.add('nav-link-visible'), i * 55);
  });
}

function animateNavOut() {
  navLinks.querySelectorAll(
    '.nav-links-list a, .nav-mobile-cta-wrap, .nav-mobile-tagline'
  ).forEach(el => el.classList.remove('nav-link-visible'));
}

function openNav() {
  navLinks.classList.add('open');
  navLinks.setAttribute('aria-hidden', 'false');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.setAttribute('aria-label', 'Close navigation menu');
  navToggle.classList.add('active');
  document.body.style.overflow = 'hidden';

  animateNavIn();

  /* Move focus to the close button after transition */
  setTimeout(() => {
    const closeBtn = document.getElementById('navMobileClose');
    if (closeBtn) closeBtn.focus();
  }, 300);
}

function closeNav() {
  navLinks.classList.remove('open');
  navLinks.setAttribute('aria-hidden', 'true');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation menu');
  navToggle.classList.remove('active');
  document.body.style.overflow = '';

  animateNavOut();

  /* Return focus to the hamburger button */
  navToggle.focus();
}

/* Hamburger toggle */
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.contains('open');
  isOpen ? closeNav() : openNav();
});

/* Close button inside overlay */
if (navMobileClose) {
  navMobileClose.addEventListener('click', closeNav);
}

/* Close on nav link click */
navLinks.querySelectorAll('.nav-links-list a, .nav-mobile-cta').forEach(link => {
  link.addEventListener('click', () => {
    closeNav();
  });
});

/* Escape key closes menu */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    closeNav();
  }
});

/* Focus trap inside the open overlay */
document.addEventListener('keydown', e => {
  if (!navLinks.classList.contains('open') || e.key !== 'Tab') return;

  const focusable = getNavFocusable();
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey) {
    /* Shift+Tab: wrap from first to last */
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    /* Tab: wrap from last to first */
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});


/* =============================================
   ACTIVE NAV LINK — class-based (no inline style)
   ============================================= */
const sections       = document.querySelectorAll('section[id]');
const navAnchorLinks = document.querySelectorAll('.nav-links-list a');

/* Close mobile menu automatically on resize to desktop */
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && navLinks.classList.contains('open')) {
    closeNav();
  }
}, { passive: true });

function updateActiveNav() {
  const scrollMid = window.scrollY + window.innerHeight * 0.45;

  sections.forEach(section => {
    const top    = section.offsetTop - 20;
    const bottom = top + section.offsetHeight;
    const id     = section.id;

    if (scrollMid >= top && scrollMid < bottom) {
      navAnchorLinks.forEach(a => {
        const matches = a.getAttribute('href') === `#${id}`;
        a.classList.toggle('active', matches);
      });
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();


/* =============================================
   SCROLL REVEAL ANIMATION
   ============================================= */
function setupReveal() {
  const groups = [
    '.services-grid',
    '.benefit-grid',
    '.steps-row',
    '.footer-grid',
  ];

  const solos = [
    '.section-header',
    '.usp-banner',
    '.hero-badge',
    '.hero-headline',
    '.hero-subheadline',
    '.hero-desc',
    '.hero-actions',
    '.hero-stats',
    '.coverage-placeholder',
    '.contact-info',
    '.contact-form',
    '.how-it-works-note',
  ];

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  groups.forEach(selector => {
    document.querySelectorAll(selector).forEach(group => {
      const children = Array.from(group.children).filter(
        el => !el.classList.contains('step-connector')
      );
      children.forEach((child, i) => {
        child.classList.add('reveal');
        child.style.transitionDelay = `${i * 0.1}s`;
        observer.observe(child);
      });
    });
  });

  solos.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('reveal');
      observer.observe(el);
    });
  });

  document.querySelectorAll('.contact-info-block, .contact-hours, .contact-trust').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${i * 0.07}s`;
    observer.observe(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupReveal);
} else {
  setupReveal();
}


/* =============================================
   EARLY ACCESS FORM
   Submits to POST /api/early-access.
   The Vercel serverless function forwards the
   registration to Google Apps Script → Sheets.
   Success is only confirmed when the API returns
   { ok: true } — no simulated successes.
   ============================================= */

const contactForm = document.getElementById('contactForm');

/* Focus state for hero form inputs */
contactForm.querySelectorAll('input').forEach(field => {
  const group = field.closest('.hero-form-group');
  if (!group) return;
  field.addEventListener('focus', () => group.classList.add('is-focused'));
  field.addEventListener('blur',  () => group.classList.remove('is-focused'));
});

/* ── Helpers ── */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  if (!field || !error) return;
  if (message) {
    field.classList.add('is-invalid');
    error.textContent = message;
    error.classList.add('visible');
  } else {
    field.classList.remove('is-invalid');
    error.textContent = '';
    error.classList.remove('visible');
  }
}

function clearErrors() {
  ['name', 'instagram'].forEach(id => {
    const f = document.getElementById(id);
    if (f) f.classList.remove('is-invalid');
  });
  ['nameError', 'instagramError'].forEach(id => {
    const e = document.getElementById(id);
    if (e) { e.textContent = ''; e.classList.remove('visible'); }
  });
  const submitErr = document.getElementById('submitError');
  if (submitErr) { submitErr.textContent = ''; submitErr.classList.remove('visible'); }
}

function showSubmitError(msg) {
  const el = document.getElementById('submitError');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

/* ── Validation ── */
function validateForm() {
  let valid = true;

  /* Full Name */
  const name = getVal('name');
  if (!name) {
    setFieldError('name', 'nameError', 'Please enter your full name.');
    valid = false;
  } else if (name.length < 2) {
    setFieldError('name', 'nameError', 'Name must be at least 2 characters.');
    valid = false;
  } else {
    setFieldError('name', 'nameError', '');
  }

  /* Instagram Username — strip @, validate format */
  const rawIG   = getVal('instagram');
  const igHandle = rawIG.startsWith('@') ? rawIG.slice(1) : rawIG;

  if (!rawIG) {
    setFieldError('instagram', 'instagramError', 'Please enter your Instagram username.');
    valid = false;
  } else if (!/^[a-zA-Z0-9._]{1,30}$/.test(igHandle)) {
    setFieldError('instagram', 'instagramError', 'Enter a valid username — letters, numbers, . and _ only, no spaces.');
    valid = false;
  } else {
    setFieldError('instagram', 'instagramError', '');
  }

  return valid;
}

/* ── Loading state ── */
function setSubmitState(state) {
  const btn     = document.getElementById('submitBtn');
  const btnText = document.getElementById('submitBtnText');
  if (!btn || !btnText) return;

  if (state === 'loading') {
    btn.disabled       = true;
    btn.style.opacity  = '0.72';
    btnText.textContent = 'Submitting…';
  } else {
    btn.disabled       = false;
    btn.style.opacity  = '';
    btnText.textContent = 'Join Early Access';
  }
}

/* ── Submit handler ── */
contactForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors();

  if (!validateForm()) {
    const firstInvalid = contactForm.querySelector('.is-invalid');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus();
    }
    return;
  }

  const fullName = getVal('name');
  const rawIG    = getVal('instagram');
  /* Normalise: always store without leading @ */
  const instagramUsername = rawIG.startsWith('@') ? rawIG.slice(1) : rawIG;

  setSubmitState('loading');

  try {
    const response = await fetch('/api/early-access', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify({ fullName, instagramUsername }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) { /* non-JSON body — handled below */ }

    if (response.ok && data && data.ok === true) {
      /* ── Confirmed success from Google Apps Script ── */
      if (data.alreadyRegistered === true) {
        /* Username already in Sheets — show appropriate message */
        showAlreadyRegisteredModal();
        /* Do NOT reset the form so the user can see their entries */
      } else {
        /* New registration saved to Sheets */
        showSuccessModal(fullName);
        contactForm.reset();
        clearErrors();
      }
    } else {
      /* Server returned an error or ok !== true — show message, preserve inputs */
      const msg = (data && data.message)
        ? data.message
        : 'We couldn\'t complete your registration. Please try again.';
      showSubmitError(msg);
    }
  } catch (_err) {
    /* Network error or endpoint unavailable */
    showSubmitError('We couldn\'t complete your registration. Please try again.');
  } finally {
    setSubmitState('ready');
  }
});

/* ── Thank You modal — new registration confirmed ── */
function showSuccessModal(name) {
  _showModal({
    id:      'earlyAccessModal',
    iconSvg: `<img src="assets/branding/SERICACARE.png"
                   alt="SERICA Care"
                   class="prompt-logo-img"
                   width="120" height="40"
                   loading="eager"
                   decoding="sync" />`,
    title:   'You\'re on the List!',
    body:    'Thank you for joining SERICA Care Early Access. Stay connected for updates about our upcoming launch in BSD City.',
    cta:     'Got It',
  });
}

/* ── Already Registered modal ── */
function showAlreadyRegisteredModal() {
  _showModal({
    id:      'earlyAccessModal',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                   width="32" height="32">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>`,
    title:   'You\'re Already on the List!',
    body:    'This Instagram username is already registered for SERICA Care Early Access.',
    cta:     'Got It',
  });
}

/* ── Shared modal builder ── */
function _showModal({ id, iconSvg, title, body, cta }) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = id;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modalTitle');
  modal.innerHTML = `
    <div class="prompt-backdrop"></div>
    <div class="prompt-panel">
      <div class="prompt-icon" aria-hidden="true">${iconSvg}</div>
      <h3 class="prompt-title" id="modalTitle">${title}</h3>
      <p class="prompt-body">${body}</p>
      <button class="btn btn-primary prompt-cta" id="modalClose">${cta}</button>
    </div>`;

  injectModalStyles();
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  /* Focus the close button after transition */
  setTimeout(() => {
    const closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.focus();
  }, 50);

  function closeModal() {
    modal.style.opacity    = '0';
    modal.style.transition = 'opacity 0.2s ease';
    setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 200);
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.querySelector('.prompt-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', function onKey(ev) {
    if (ev.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKey);
    }
  });
}

/* ── Shared modal styles (injected once) ── */
function injectModalStyles() {
  if (document.getElementById('modalStyles')) return;
  const style = document.createElement('style');
  style.id = 'modalStyles';
  style.textContent = `
    #earlyAccessModal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
    .prompt-backdrop{position:absolute;inset:0;background:rgba(49,25,9,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
    .prompt-panel{position:relative;z-index:1;background:#fff;border-top:3px solid #994B25;border-radius:4px;padding:48px 44px;max-width:460px;width:100%;box-shadow:0 32px 80px rgba(49,25,9,.22);animation:promptIn .3s cubic-bezier(0,0,.2,1);}
    @keyframes promptIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    .prompt-icon{width:120px;height:65px;border-radius:8px;background:#311909;border:none;display:flex;align-items:center;justify-content:center;padding:10px 16px;margin-bottom:24px;}
    .prompt-logo-img{display:block;width:100%;height:100%;object-fit:contain;filter:brightness(0) invert(1);opacity:.92;}
    .prompt-title{font-family:'Cormorant Garamond',Georgia,serif;font-size:1.75rem;font-weight:600;color:#311909;margin-bottom:12px;line-height:1.15;}
    .prompt-body{font-size:.9375rem;color:#6b5a4e;line-height:1.75;margin-bottom:28px;font-weight:300;}
    .prompt-cta{width:100%;justify-content:center;}
  `;
  document.head.appendChild(style);
}

/* =============================================
   PRIVACY POLICY MODAL
   Completely independent of the Early Access
   Thank You popup. Uses <dialog> element.
   IDs: privacyPolicyModal, ppModalClose,
        ppModalCloseBottom, ppBackdrop,
        privacyPolicyTrigger
   ============================================= */

(function () {
  'use strict';

  /* ── Element references ── */
  const ppModal        = document.getElementById('privacyPolicyModal');
  const ppTrigger      = document.getElementById('privacyPolicyTrigger');
  const ppClose        = document.getElementById('ppModalClose');
  const ppCloseBottom  = document.getElementById('ppModalCloseBottom');
  const ppBackdrop     = document.getElementById('ppBackdrop');

  /* Guard: bail if any required element is missing */
  if (!ppModal || !ppTrigger || !ppClose || !ppCloseBottom || !ppBackdrop) return;

  /* ── State ── */
  let ppIsOpen        = false;
  let ppScrollY       = 0;      /* saved scroll position for body-lock */
  let ppKeydownHandle = null;   /* stored so it can be removed on close */

  /* ── All focusable items inside the modal panel ── */
  function getPpFocusable() {
    return Array.from(
      ppModal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])'
      )
    );
  }

  /* ── Open ── */
  function openPpModal() {
    if (ppIsOpen) return;
    ppIsOpen = true;

    /* Prevent body scroll — save position first */
    ppScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';

    /* Show the dialog */
    ppModal.classList.remove('pp-modal--closing');
    ppModal.classList.add('pp-modal--open');

    /* Focus the top close button after the entrance animation */
    setTimeout(() => ppClose.focus(), 50);

    /* Keyboard handler: Escape + focus trap */
    ppKeydownHandle = function (e) {
      if (e.key === 'Escape') {
        closePpModal();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getPpFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', ppKeydownHandle);
  }

  /* ── Close ── */
  function closePpModal() {
    if (!ppIsOpen) return;
    ppIsOpen = false;

    /* Play exit animation, then hide */
    ppModal.classList.add('pp-modal--closing');

    setTimeout(() => {
      ppModal.classList.remove('pp-modal--open', 'pp-modal--closing');

      /* Restore body scroll */
      document.body.style.overflow = '';
    }, 210);  /* matches animation duration */

    /* Remove keyboard handler */
    if (ppKeydownHandle) {
      document.removeEventListener('keydown', ppKeydownHandle);
      ppKeydownHandle = null;
    }

    /* Return focus to the trigger link */
    ppTrigger.focus();
  }

  /* ── Event bindings ── */

  /* Trigger: open modal — must not submit the form */
  ppTrigger.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    openPpModal();
  });

  /* Top close button */
  ppClose.addEventListener('click', closePpModal);

  /* Bottom close button */
  ppCloseBottom.addEventListener('click', closePpModal);

  /* Click-outside on backdrop */
  ppBackdrop.addEventListener('click', closePpModal);

  /* Prevent clicks on the panel from bubbling to the backdrop */
  ppModal.querySelector('.pp-panel').addEventListener('click', function (e) {
    e.stopPropagation();
  });

})();
