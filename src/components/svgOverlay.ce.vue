<script>
import svgPanZoom from "svg-pan-zoom";
import Hammer from "hammerjs";
export default {
  props: {
    bgImage: String,
    svgArray: {
      type: String,
    },
  },
  emits: ["clickEvent", "mouseEnter", "mouseLeave", "svgLoaded"],
  expose: ['zoom', 'setColor'],
  data() {
    return {
      containerRef: null,
      layers: [],
      style: [],
    };
  },
  mounted() {
    const validJSONString = this.svgArray.replace(/'/g, '"');
    const array = JSON.parse(validJSONString);
    this.loadSVG(array);
  },
  methods: {
    loadSVG(svgarr) {
      if (svgarr.length) {
        Promise.all([...svgarr.map((svg) => this.readSVGLink(svg))]).then(
          () => {
            var svgElement = this.$refs.SVGLayer;
            var gTags = Array.from(svgElement.children);
            this.$emit(
              "svgLoaded",
              gTags.filter(
                (item) => item.tagName != "image" && item.tagName != "style"
              )
            );
            this.setupPanzoom();
          }
        );
      } else {
        this.$emit("svgLoaded");
        // this.setupPanzoom();
      }
    },
    readSVGLink(svg_url) {
      return new Promise(async (resolve) => {
        var requestOptions = {
          method: "GET",
          redirect: "follow",
        };
        if (svg_url) {
          var url = svg_url;
          fetch(url, requestOptions)
            .then((response) => response.text())
            .then(async (result) => {
              var tempElement = document.createElement("div");
              tempElement.innerHTML = result;

              for (var i = 0; i < tempElement.children.length; i++) {
                for (
                  var j = 0;
                  j < tempElement.children[i].children.length;
                  j++
                ) {
                  if (tempElement.children[i].children[j].tagName == "style") {
                    this.style.push(tempElement.children[i].children[j]);
                  } else {
                    this.layers.push(tempElement.children[i].children[j]);
                  }
                }
              }
              resolve();
            })
            .catch((error) => console.log("error", error));
        }
      });
    },
    clickEvent(e) {
      this.$emit("clickEvent", e);
    },
    mouseEnter(e) {
      this.$emit("mouseEnter", e);
    },
    mouseLeave(e) {
      this.$emit("mouseLeave", e);
    },
    setupPanzoom() {
      var beforePan;
      var eventsHandler;
      beforePan = function (oldPan, newPan) {
        var gutterWidth = this.getSizes().width,
          gutterHeight = this.getSizes().height,
          // Computed variables
          sizes = this.getSizes(),
          leftLimit =
            -((sizes.viewBox.x + sizes.viewBox.width) * sizes.realZoom) +
            gutterWidth,
          rightLimit =
            sizes.width - gutterWidth - sizes.viewBox.x * sizes.realZoom,
          topLimit =
            -((sizes.viewBox.y + sizes.viewBox.height) * sizes.realZoom) +
            gutterHeight,
          bottomLimit =
            sizes.height - gutterHeight - sizes.viewBox.y * sizes.realZoom;

        var customPan = {};
        customPan.x = Math.max(leftLimit, Math.min(rightLimit, newPan.x));
        customPan.y = Math.max(topLimit, Math.min(bottomLimit, newPan.y));
        return customPan;
      };
      eventsHandler = {
        haltEventListeners: [
          "touchstart",
          "touchend",
          "touchmove",
          "touchleave",
          "touchcancel",
        ],
        init: this.initpanZoom,
      };
      const shadowHost = document.querySelector("#svg-overlay");
      const shadowRoot = shadowHost.shadowRoot;
      const panzoomer = svgPanZoom(shadowRoot.querySelector("#SVGLayer"), {
        viewportSelector: ".svg-pan-zoom_viewport",
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: false,
        contain: true,
        center: true,
        beforePan: beforePan,
        onZoom: this.findCenterOfDiv,
        onPan: this.findCenterOfDiv,
        preventMouseEventsDefault: true,
        dblClickZoomEnabled: false,
        minZoom: 1,
        customEventsHandler: eventsHandler,
      });
      window.panzoomer = panzoomer;
    },
    initpanZoom(options) {
      var instance = options.instance,
        initialScale = 1,
        pannedX = 0,
        pannedY = 0;
      // Init Hammer
      // Listen only for pointer and touch events
      this.hammer = window.Hammer(options.svgElement, {
        InputClass: window.Hammer.SUPPORT_POINTER_EVENTS
          ? window.Hammer.PointerEventInput
          : window.Hammer.TouchInput,
      });
      // Enable pinch
      this.hammer.get("pinch").set({ enable: true });
      // Handle double tap
      this.hammer.on("doubletap", function () {
        instance.zoomIn();
      });
      // Handle pan
      this.hammer.on("panstart panmove", function (ev) {
        // On pan start reset panned variables
        if (ev.type === "panstart") {
          pannedX = 0;
          pannedY = 0;
        }
        // Console.log(instance,{x: ev.deltaX - pannedX, y: ev.deltaY - pannedY})
        // Pan only the difference
        instance.panBy({ x: ev.deltaX - pannedX, y: ev.deltaY - pannedY });
        pannedX = ev.deltaX;
        pannedY = ev.deltaY;
      });
      // Handle pinch
      this.hammer.on("pinchstart pinchmove", function (ev) {
        // On pinch start remember initial zoom
        if (ev.type === "pinchstart") {
          initialScale = instance.getZoom();

          instance.zoomAtPoint(initialScale * ev.scale, {
            x: ev.center.x,
            y: ev.center.y,
          });
        }
        instance.zoomAtPoint(initialScale * ev.scale, {
          x: ev.center.x,
          y: ev.center.y,
        });
      });
      // Prevent moving the page on some devices when panning over SVG
      options.svgElement.addEventListener("touchmove", function (e) {
        e.preventDefault();
      });
      options.svgElement.addEventListener("mousemove", function (e) {
        e.preventDefault();
      });
    },
    findCenterOfDiv() {
      const panstart_panmove = new CustomEvent("hammer_panstart_panmove", {
        detail: {
          key: "event",
        },
      });
      document.dispatchEvent(panstart_panmove);
    },
    setColor(id, color) {
      const shadowHost = document.querySelector("#svg-overlay");
      const shadowRoot = shadowHost.shadowRoot;
      var svgGroup = shadowRoot.getElementById(id);
      svgGroup.style.fill = color;
    },
    // zoom(id,leftPosition,animationTimeX) {
    //   const shadowHost = document.querySelector("#svg-overlay");
    //   const shadowRoot = shadowHost.shadowRoot;
    //   var svgGroup = shadowRoot.getElementById(id);
    //   // Get the bounding rectangle of the SVG group
    //   var rect = svgGroup.getBoundingClientRect();
    //   // Define animation parameters
    //   var animationTime = 300; // Ms
    //   var animationStepTime = 15;
    //   var animationSteps = animationTime / animationStepTime;
    //   var animationStep = 0;
    //   if (window.panzoomer) {
    //     // Define the duration of the animation in milliseconds
    //     const duration = 1000; // You can adjust this value as needed
    //     const targetZoom = 1.75;

    //     // Calculate the difference between current and target zoom levels
    //     const currentZoom = window.panzoomer.getZoom();
    //     const zoomDifference = targetZoom - currentZoom;
    //     // Calculate the increment per frame for zooming
    //     const incrementPerFrame = zoomDifference / (duration / (1000 / 60)); // Assuming 60 FPS

    //     // Calculate initial pan amounts
    //     const initialRectYPercent =
    //       window.innerHeight / 2 - rect.top + rect.height / 2 - rect.height;
    //     const initialRectXPercent =
    //       window.innerWidth / 2 - rect.left + rect.width / 2 - rect.width;
    //     let stepX = initialRectXPercent / animationSteps;
    //     let stepY = initialRectYPercent / animationSteps;

    //     // Record the start time of the animation
    //     const startTime = performance.now();

    //     // Define the animation function
    //     const animate = (timestamp) => {
    //       // Calculate the time elapsed since the animation started
    //       const elapsed = timestamp - startTime;

    //       // Update the current zoom level
    //       let newZoom = currentZoom + incrementPerFrame * elapsed;
    //       if (zoomDifference > 0) {
    //         newZoom = Math.min(newZoom, targetZoom);
    //       } else {
    //         newZoom = Math.max(newZoom, targetZoom);
    //       }
    //       window.panzoomer.zoomAtPoint(newZoom, { x: window.innerWidth - leftPosition, y: rect.top });

    //       // Recalculate pan amounts at each step
    //       const rectYPercent =
    //         window.innerHeight / 2 - rect.top + rect.height / 2 - rect.height;
    //       const rectXPercent =
    //         (window.innerWidth / 2 - rect.left + rect.width / 2 - rect.width);
    //       stepX = rectXPercent / animationSteps;
    //       stepY = rectYPercent / animationSteps;

    //       // Pan the SVG group
    //       if (animationStep++ < animationSteps && rectXPercent !== 0) {
    //         window.panzoomer.panBy({ x: 0, y: stepY });
    //         // Request next animation frame
    //         requestAnimationFrame(animate);
    //       } else {
    //         // If animation is complete, set the final zoom level
    //         window.panzoomer.zoomAtPoint(targetZoom, {
    //           x: window.innerWidth / 2 - leftPosition,
    //           y: rect.top,
    //         });
    //       }
    //     };

    //     // Start the animation
    //     requestAnimationFrame(animate);
    //   }
    // },
    zoom(id, leftPosition, animationTimeX) {
      console.log("dadsd")
      const shadowHost = document.querySelector("#svg-overlay");
      const shadowRoot = shadowHost.shadowRoot;
      var svgGroup = shadowRoot.getElementById(id);
      // Get the bounding rectangle of the SVG group
      var rect = svgGroup.getBoundingClientRect();
      // Define animation parameters
      var animationTimeY = animationTimeX / 3; 
      var animationStepTime = 15;
      var animationStepsY = animationTimeY / animationStepTime;
      var animationStepsX = (animationTimeX / 2) / animationStepTime;
      var animationStepY = 0;
      var animationStepX = 0;

      if (window.panzoomer) {
        const targetZoom = 1.75;

        // Calculate the difference between current and target zoom levels
        const currentZoom = window.panzoomer.getZoom();
        const zoomDifference = targetZoom - currentZoom;
        // Calculate the increment per frame for zooming
        const incrementPerFrame = zoomDifference / (animationTimeX / (1000 / 60)); // Assuming 60 FPS

        // Calculate initial pan amounts
        const initialRectYPercent =
          window.innerHeight / 2 - rect.top + rect.height / 2 - rect.height;
        const initialRectXPercent =
          window.innerWidth / 2 - rect.left + rect.width / 2 - rect.width;
        let stepX = initialRectXPercent / animationStepsX;
        let stepY = initialRectYPercent / animationStepsY;
      
        // Record the start time of the animation
        const startTime = performance.now();

        // Define the animation function
        const animate = (timestamp) => {
          // Calculate the time elapsed since the animation started
          const elapsed = timestamp - startTime;

          // Update the current zoom level
          let newZoom = currentZoom + incrementPerFrame * elapsed;
          if (zoomDifference > 0) {
            newZoom = Math.min(newZoom, targetZoom);
          } else {
            newZoom = Math.max(newZoom, targetZoom);
          }
          window.panzoomer.zoomAtPoint(newZoom, { x: window.innerWidth - leftPosition, y: rect.top });

          // Recalculate pan amounts at each step
          const rectYPercent =
            window.innerHeight / 2 - rect.top + rect.height / 2 - rect.height;
          const rectXPercent =
            window.innerWidth / 2 - rect.left + rect.width / 2 - rect.width;
          stepX = rectXPercent / animationStepsX;
          stepY = rectYPercent / animationStepsY;

          // Pan the SVG group on Y-axis
          if (animationStepY++ < animationStepsY && rectYPercent !== 0) {
            window.panzoomer.panBy({ x: 0, y: stepY });
          }

          // Pan the SVG group on X-axis
          if (animationStepX++ < animationStepsX && rectXPercent !== 0) {
            window.panzoomer.panBy({ x: 0, y: 0 });
          }

          // Request next animation frame
          if (animationStepY < animationStepsY || animationStepX < animationStepsX) {
              requestAnimationFrame(animate);
          } else {
            // If animation is complete, set the final zoom level
            console.log(targetZoom)

            window.panzoomer.zoomAtPoint(targetZoom, {
              x: window.innerWidth / 2 - leftPosition,
              y: rect.top,
            });
          }
        };

        // Start the animation
        requestAnimationFrame(animate);
      }
    }

  },
};
</script>
<template>
  <div ref="containerRef" class="svgContainer">
    <div class="svgWrapper">
      <svg ref="SVGLayer" version="1.1" id="SVGLayer" xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1920 1080"
        style="enable-background: new 0 0 1920 1080" xml:space="preserve" preserveAspectRatio="xMidYMid slice"
        class="svgLayer">
        <image style="transform-origin: center center;transition: transform 2s; opacity:0.1s;object-fit:contain"
          v-bind:xlink:href="bgImage"></image>
        <component v-for="layer in style" :key="layer" is="style" v-html="layer.innerHTML"></component>
        <g @click="clickEvent(layer)" @mouseenter="mouseEnter(layer)" @mouseleave="mouseLeave(layer)"
          v-for="layer in layers" :key="layer" :id="layer.getAttribute('id')" :class="layer.getAttribute('class')"
          v-html="layer.innerHTML"></g>
      </svg>
    </div>
  </div>
</template>
<style scoped>
svg {
  height: 100%;
  width: 100%;
}

.svgLayer {
  /* width: auto; */
  height: 100%;
  display: block;
  overflow: auto;
}

.svgContainer {
  height: 100%;
  width: 100%;
  position: relative;
  user-select: none;
  overflow: hidden;
  /* transform-origin: center center;
  transition: transform 0.5s, opacity 0.5s; */
}

.svgWrapper {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.fade-in-overlay {
  opacity: 0;
  transition: opacity 2s ease;
}

.fade-in-animation {
  opacity: 1;
}

.svgContainer.active {
  transform: scale(1.2);
  opacity: 0;
}

.svgContent {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  white-space: nowrap;
  scroll-behavior: smooth;
}

.svgContent::-webkit-scrollbar {
  width: 0px;
  height: 0px;
}

.svg-pan-zoom_viewport {
  height: 100%;
  width: 100%;
}
</style>
