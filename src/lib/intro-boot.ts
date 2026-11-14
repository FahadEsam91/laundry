export const INTRO_KEY = "nq-intro";

/** Runs before first paint: skip the intro for returning visits in this session and for reduced-motion users. */
export const INTRO_BOOT = `try{if(sessionStorage.getItem("${INTRO_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("nq-intro-seen")}catch(e){}`;
