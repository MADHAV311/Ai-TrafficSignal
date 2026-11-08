/**
 * AI Adaptive Traffic Signal Digital Twin - Application Entry Point (Hero Single Canvas)
 */

import { ApiClient } from './api/ApiClient.js';
import { Renderer } from './rendering/Renderer.js';
import { ChartRenderer } from './rendering/ChartRenderer.js';
import { DashboardUI } from './ui/DashboardUI.js';

class App {
  constructor() {
    this.apiClient = new ApiClient();
    this.chartRenderer = new ChartRenderer();

    // Single Central Hero Canvas
    this.canvas = document.getElementById('hero-canvas');
    this.renderer = new Renderer(this.canvas);

    // Dashboard UI
    this.ui = new DashboardUI(this.apiClient, this.chartRenderer, this.renderer);

    this.renderer.onVehicleSelect = (veh) => {
      this.ui.updateTelemetryCard(veh);
    };

    this.latestState = null;
    this.isFetchingState = false;

    this.initInteractiveCanvas();
    this.bindKeyboardShortcuts();
    this.bindResize();

    // Start background state polling at 25 Hz
    this.startStatePolling();

    // Start rendering loop at 60 FPS
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  bindResize() {
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.ui.isPlaying = !this.ui.isPlaying;
          this.ui.updatePlayPauseBtn();
          await this.apiClient.sendControl(this.ui.isPlaying ? 'play' : 'pause');
          break;
        case 'Digit1':
          this.ui.selectSpeed.value = '1';
          await this.apiClient.sendControl('speed', { speed: 1.0 });
          break;
        case 'Digit2':
          this.ui.selectSpeed.value = '2';
          await this.apiClient.sendControl('speed', { speed: 2.0 });
          break;
        case 'Digit3':
          this.ui.selectSpeed.value = '4';
          await this.apiClient.sendControl('speed', { speed: 4.0 });
          break;
        case 'KeyR':
          await this.apiClient.sendControl('reset');
          this.ui.showToast('Reset (Key R)');
          break;
      }
    });
  }

  initInteractiveCanvas() {
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.latestState) return;

      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const wx = (clientX - this.renderer.panX) / this.renderer.scale;
      const wy = (clientY - this.renderer.panY) / this.renderer.scale;

      const heroSim = (this.ui.heroMode === 'AI') ? this.latestState.simAdaptive : this.latestState.simFixed;
      const vehicles = heroSim ? heroSim.vehicles : [];

      let hovered = null;
      if (this.renderer.camera && this.renderer.camera.mode !== '2D_PLAN' && this.renderer.renderer3D) {
        if (!this.renderer.renderer3D.camera.isDragging) {
          hovered = this.renderer.renderer3D.findVehicleAtScreen(e.clientX, e.clientY, vehicles);
        }
      } else {
        for (const v of vehicles) {
          const dx = v.x - wx;
          const dy = v.y - wy;
          if (Math.sqrt(dx * dx + dy * dy) <= 24) {
            hovered = v;
            break;
          }
        }
      }

      this.renderer.hoveredVehicle = hovered;
      if (hovered) {
        this.ui.updateTelemetryCard(hovered);
      }

      if (hovered && this.ui.vehicleTooltip) {
        const tt = this.ui.vehicleTooltip;
        tt.style.display = 'block';
        tt.style.left = `${e.clientX + 14}px`;
        tt.style.top = `${e.clientY + 14}px`;
        tt.innerHTML = `
          <div style="font-weight: 700; color: var(--color-primary); font-size: 11px; margin-bottom: 2px;">
            ${hovered.name || hovered.id} (${hovered.type})
          </div>
          <div style="font-size: 11px; color: #fff;">
            Speed: <strong>${hovered.speed} px/s</strong><br>
            Wait Time: <strong style="color: ${hovered.waitTime > 15 ? 'var(--color-red)' : 'var(--color-green)'};">${hovered.waitTime} s</strong><br>
            Turn: <strong>${hovered.turn}</strong> (Rd ${hovered.roadId} ➔ ${hovered.targetRoad || 'Exit'})
          </div>
        `;
      } else if (this.ui.vehicleTooltip) {
        this.ui.vehicleTooltip.style.display = 'none';
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.renderer.hoveredVehicle) {
        this.renderer.selectedVehicle = this.renderer.hoveredVehicle;
        this.ui.updateTelemetryCard(this.renderer.selectedVehicle);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.renderer.hoveredVehicle = null;
      if (this.ui.vehicleTooltip) {
        this.ui.vehicleTooltip.style.display = 'none';
      }
    });
  }

  async startStatePolling() {
    const poll = async () => {
      if (!this.isFetchingState) {
        this.isFetchingState = true;
        try {
          const state = await this.apiClient.getState();
          if (state) {
            this.latestState = state;
            this.ui.updateFromBackendState(state);
          }
        } catch (err) {
          // Handled gracefully in ApiClient
        } finally {
          this.isFetchingState = false;
        }
      }
      setTimeout(poll, 40); // 25 Hz
    };
    poll();
  }

  renderLoop() {
    if (this.latestState) {
      const heroSim = (this.ui.heroMode === 'AI') ? this.latestState.simAdaptive : this.latestState.simFixed;
      if (heroSim) {
        this.renderer.render(heroSim);
      }
    }

    requestAnimationFrame((t) => this.renderLoop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
});
