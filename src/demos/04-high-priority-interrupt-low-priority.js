import { Component, useEffect, useState, useRef } from "react";

class App extends Component {
  state = { count: 0 }
  onClick = () => {
    this.setState(({count }) => ({ count:  count+2 }))
  }
  componentDidMount() {
    const button = this.button;
    setTimeout(() => this.setState({ count: 1 }), 1000);
    setTimeout(() => button.click(), 1040);
  }
  render() {
    return (
      <div>
        <button ref={node => this.button = node} onClick={this.onClick}>
          增加2
        </button>
        <div>
          {Array.from(new Array(240000)).map((v, index) => (
            <span key={index}>{this.state.count}</span>
          ))}
        </div>
      </div>
    );
  }
}


export default App;