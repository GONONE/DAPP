module game {
	export class LoadScreen extends eui.Component {

		public loadLabel: eui.Label;
		public chipImg: eui.Image;

		private playCount: number = 0;

		public constructor() {
			super();
			this.addEventListener(egret.Event.ADDED_TO_STAGE, this.createCompleteEvent, this);
			ApplicationFacade.getInstance().registerMediator(new LoadMediator(this));
		}

		public childrenCreated() {
			super.childrenCreated();
			this.left = 0;
			this.right = 0;
			this.top = 0;
			this.bottom = 0;
		}

		public createCompleteEvent() {
			this.skinName = "skins.LoadingToDeskSkin";
			this.startrotateAndChangeSource();
		}

		public startrotateAndChangeSource() {
			this.addEventListener(egret.Event.ENTER_FRAME, this.chipTurn, this);
			this.addEventListener(egret.Event.ENTER_FRAME, this.loadingTurn, this);
		}

		public stoprotate() {
			this.removeEventListener(egret.Event.ENTER_FRAME, this.chipTurn, this);
			this.removeEventListener(egret.Event.ENTER_FRAME, this.loadingTurn, this);
		}

		public chipTurn() {
			var speed = 65;     //旋转速度，数字越小速度越快
			var index = this.playCount % speed;
			var angle1 = (index * Math.PI / (speed / 2));
			var angle2 = (index + 1) * Math.PI / (speed / 2);
			var changeX = 30 * (Math.cos(angle1) - Math.cos(angle2));

			if (index < speed / 4 || index > 3 * speed / 4 - 1) {
				this.chipImg.x += changeX;
				this.chipImg.width -= 2 * changeX;
			} else {
				this.chipImg.x -= changeX;
				this.chipImg.width += 2 * changeX;
			}
			this.playCount++;
		}

		public loadingTurn() {
			var speed = 5;     // 加点速度，每N帧1次

			// switch (UserUtils.getInstance().curType) {
			// 	case PokerType.PC_POKER_MATCH:
			// 		this.loadLabel.text = "匹配对手";
			// 		break;
			// 	case PokerType.PC_NEW_ADDRESS:
			// 		this.loadLabel.text = "匹配成功";
			// 		break;
			// 	case PokerType.PC_POKER_ADDRESS:
			// 		this.loadLabel.text = "多签地址";
			// 		break;
			// 	case PokerType.PC_POKER_BALANCE:
			// 		this.loadLabel.text = "公开余额";
			// 		break;
			// 	case PokerType.PC_POKER_HANDLE:
			// 	case PokerType.PC_POKER_PUBKEY:
			// 	case PokerType.PC_POKER_PUBKEY_VERIFY:
			// 	case PokerType.PC_POKER_SSH:
			// 		this.loadLabel.text = "洗牌";
			// 		break;
			// 	case PokerType.PC_POKER_SHUFFLE:
			// 	case PokerType.PC_POKER_HAND_CARD:
			// 		this.loadLabel.text = "发手牌";
			// 		break;
			// }

			switch (PokerCache.getInstance().curCode) {
				case PokerCode.MATCH:
				case PokerCode.MATCHING:
					this.loadLabel.text = "匹配对手";
					break;
				case PokerCode.BALANCE:
					this.loadLabel.text = "公开余额";
					break;
				case PokerCode.SHUFFLE:
					this.loadLabel.text = "洗牌";
					break;
				case PokerCode.HAND_CARD:
					this.loadLabel.text = "发手牌";
					break;
			}

			for (var i = 0; i < this.playCount % (5 * speed); i += speed) {
				this.loadLabel.text += ".";
			}
		}
	}
}