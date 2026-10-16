/** Browser-wide exclusive ownership. No unsafe localStorage lease fallback. */
export class WriterLock {
  owned=false;
  waiting=false;
  private releaseCurrent:(()=>void)|null=null;
  private pending:AbortController|null=null;
  private generation=0;
  constructor(private changed:()=>void) {}
  get supported(){return typeof navigator.locks?.request==='function';}
  acquire(wait=false){
    if(!this.supported || this.owned || this.waiting)return;
    const generation=++this.generation;
    this.waiting=true;this.pending=new AbortController();this.changed();
    const options:LockOptions=wait ? {mode:'exclusive',signal:this.pending.signal} : {mode:'exclusive',ifAvailable:true};
    void navigator.locks.request('balatro-advisor-confirmed-writer-v1',options,async lock=>{
      if(generation!==this.generation)return;
      this.waiting=false;this.pending=null;
      if(!lock){this.changed();return;}
      this.owned=true;this.changed();
      await new Promise<void>(resolve=>{this.releaseCurrent=resolve;});
      if(generation===this.generation){this.owned=false;this.releaseCurrent=null;this.changed();}
    }).catch(()=>{if(generation===this.generation){this.waiting=false;this.pending=null;this.owned=false;this.changed();}});
  }
  release(){this.generation++;this.owned=false;this.pending?.abort();this.pending=null;this.waiting=false;this.releaseCurrent?.();this.releaseCurrent=null;this.changed();}
  assert(){if(!this.owned)throw new Error('Esta pestaña no tiene el control de escritura.');}
}
