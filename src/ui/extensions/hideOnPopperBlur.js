// Causes a popper to hide if no elements within it are in focus.
// Source: https://atomiks.github.io/tippyjs/v6/plugins/#hideonpopperblur

/* istanbul ignore file */

export const hideOnPopperBlur = {
  name: "hideOnPopperBlur",
  defaultValue: true,
  fn(instance) {
    return {
      onCreate() {
        instance.popper.addEventListener("focusout", (event) => {
          if (
            instance.props.hideOnPopperBlur &&
            event.relatedTarget &&
            !instance.popper.contains(event.relatedTarget)
          ) {
            instance.hide();
          }
        });
      }
    };
  }
};
