// Shared KaTeX auto-render bootstrap
// Every page links this after the KaTeX auto-render script
document.addEventListener("DOMContentLoaded", function() {
  if (typeof renderMathInElement === "function") {
    renderMathInElement(document.body, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false},
        {left: "\\[", right: "\\]", display: true},
        {left: "\\(", right: "\\)", display: false}
      ],
      throwOnError: false
    });
  }
});
