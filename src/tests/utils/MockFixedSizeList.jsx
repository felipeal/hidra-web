import React, { Component } from "react";

export class MockFixedSizeList extends Component {
  constructor(props) {
    super(props);
    this.state = { scrollOffset: 0 };
  }

  scrollTo() {/* */}

  render() {
    return <>
      {/* eslint-disable-next-line react/prop-types */}
      {[...Array(8).keys()].map(n => this.props.children({ index: n }))}
    </>;
  }
}
