import { h, Component } from 'preact';
import Canvas from './Canvas';
import './Game.css';

interface Props {
  width?: number;
  height?: number;
  depth?: number;
}

export default class Game extends Component<Props, void> {

  render() {
    return (
      <div id="game">
        <Canvas />
      </div>
    );
  }
}