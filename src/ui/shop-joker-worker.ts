import {assessShopJokers} from '../advisor/shop-joker-survival.js';
import type {ShopJokerAssessment} from '../advisor/shop-joker-survival.js';
import type {GameState} from '../state/model.js';

const worker=self as unknown as {
 onmessage:((message:MessageEvent<GameState>)=>void)|null;
 postMessage(assessment:ShopJokerAssessment):void;
};

worker.onmessage=({data})=>worker.postMessage(assessShopJokers(data));
