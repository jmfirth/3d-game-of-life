import { h, Component } from 'preact';
import * as gameOfLife from './gameOfLife';
import './Game.css';

interface Props {
  width?: number;
  height?: number;
  depth?: number;
}

export default class Canvas extends Component<Props, void> {
  gameContainer: HTMLDivElement;

  gameCanvas: HTMLCanvasElement;

  startGame(xCells?: number, yCells?: number, zCells?: number) {
    const { clientWidth: width, clientHeight: height } = this.gameContainer;
    gameOfLife.start(this.gameCanvas, { width, height, xCells, yCells, zCells });
  }

  stopGame() {
    gameOfLife.stop();
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    const { width: xCells, height: yCells, depth: zCells } = this.props;
    this.startGame(xCells, yCells, zCells);
  }

  componentWillUnmount() {
    this.stopGame();
  }

  componentWillReceiveProps(next: Props) {
    if (next.width !== this.props.width
     || next.height !== this.props.height
     || next.depth !== this.props.depth) {
      this.stopGame();
      this.startGame();
    }
  }

  render() {
    return (
      <div
        id="game-container"
        ref={(gameContainer: HTMLDivElement) => { this.gameContainer = gameContainer; }}
      >
        <canvas
          id="game-canvas"
          ref={(gameCanvas: HTMLCanvasElement) => { this.gameCanvas = gameCanvas; }}
        />
      </div>
    );
  }
}