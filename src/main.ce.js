import { defineCustomElement } from 'vue'
import simpleComponent from './components/svgOverlay.ce.vue'

const svgOverlay = defineCustomElement(simpleComponent)

customElements.define('svg-overlay', svgOverlay);
