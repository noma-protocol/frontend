// Component render tracker to debug excessive re-renders

const renderCounts: Record<string, number> = {};

export function trackRender(componentName: string) {
  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;
  console.log(`[RENDER] ${componentName} render #${renderCounts[componentName]}`);
}

export function getRenderSummary() {
  console.log('\n=== COMPONENT RENDER SUMMARY ===');
  Object.entries(renderCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([component, count]) => {
      if (count > 1) {
        console.log(`  ${component}: ${count} renders`);
      }
    });
  console.log('================================\n');
  return renderCounts;
}

// Add to window for easy access
(window as any).renderSummary = getRenderSummary;