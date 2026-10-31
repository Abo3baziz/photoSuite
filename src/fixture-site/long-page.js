(function initLong() {
  const content = document.getElementById('long-content');
  if (!content) return;
  for (let i = 0; i < 60; i += 1) {
    const block = document.createElement('p');
    block.textContent = `Section ${i + 1}: long scroll segment for full-page capture stitching.`;
    content.appendChild(block);
  }
})();
