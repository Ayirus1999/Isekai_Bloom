import './style.css';

/**
 * Bootstraps the interface. The simulation, screens and frame loop are added in the
 * core-game-loop milestone; this entry point exists so the shell is runnable from the start.
 */
function boot(): void {
  document.querySelector('#loading')?.classList.add('is-hidden');
}

boot();
