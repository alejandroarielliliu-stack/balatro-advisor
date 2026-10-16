import {migrateState} from '../state/migration.js';
import type {Result} from '../state/model.js';
import {validateConfirmedRecord} from './confirmed-record.js';
import type {ConfirmedRecord} from './confirmed-record.js';

/** A format conversion, never a replay of game actions under today's rules. */
export function migrateConfirmedRecord(input:unknown):Result<ConfirmedRecord>{
  const checked=validateConfirmedRecord(input);if(!checked.ok)return checked;
  const record=checked.value;if(record.schemaVersion==='confirmed-2')return checked;
  const initial=migrateState(record.initialState);if(!initial.ok)return initial;
  const state=migrateState(record.state);if(!state.ok)return state;
  const history=[];
  for(const entry of record.history){
    const before=migrateState(entry.before);if(!before.ok)return before;
    const after=migrateState(entry.after);if(!after.ok)return after;
    history.push({...entry,before:before.value,after:after.value});
  }
  return validateConfirmedRecord({...record,schemaVersion:'confirmed-2',initialState:initial.value,state:state.value,history});
}
