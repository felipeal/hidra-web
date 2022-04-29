import React, { Component } from "react";

export class MockFixedSizeList extends Component {
  constructor(props) {
    super(props);
    this.state = { scrollOffset: 0 };
    this.scrollTo = jest.fn();
    this.scrollToItem = jest.fn();
  }

  render() {
    return <>
      {/* eslint-disable-next-line react/prop-types */}
      {[0, 1, 2, 3, 4, 5, 60, 61, 62, 63].map(n => this.props.children({ index: n }))}
    </>;
  }
}
