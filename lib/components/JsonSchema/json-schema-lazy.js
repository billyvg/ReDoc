'use strict';

import {Component, View, ElementRef} from 'angular2/core';
import {CORE_DIRECTIVES} from 'angular2/common';
import JsonSchema from './json-schema';
import {DynamicComponentLoader} from 'angular2/src/core/linker/dynamic_component_loader';
import OptionsManager from '../../options';
import SchemaManager from '../../utils/SchemaManager';


var cache = {};


@Component({
  selector: 'json-schema-lazy',
  inputs: ['pointer', 'auto']
})
@View({
  template: '',
  directives: [CORE_DIRECTIVES]
})
export default class JsonSchemaLazy {

  constructor(elementRef, dcl) {
    this.elementRef = elementRef;
    this.dcl = dcl;
  }

  normalizePointer() {
    let schema = SchemaManager.instance().byPointer(this.pointer);
    return schema && schema.$ref || this.pointer;
  }

  load() {
    if (OptionsManager.instance().options.disableLazySchemas) return;
    if (this.loaded) return;
    if (this.pointer) {
      this.dcl.loadNextToLocation(JsonSchema, this.elementRef).then((compRef) => {
        compRef.instance.pointer = this.pointer;
      });
    }
    this.loaded = true;
  }

  // cache JsonSchema view
  loadCached() {
    this.pointer = this.normalizePointer(this.pointer);
    if (cache[this.pointer]) {
      cache[this.pointer].then((compRef) => {
        setTimeout( ()=> {
          let element = compRef.location.nativeElement;

          // skip caching view with discriminator as it needs attached controller
          if (element.querySelector('.discriminator')) {
            this.dcl.loadNextToLocation(JsonSchema, this.elementRef).then((compRef) => {
              compRef.instance.pointer = this.pointer;
              compRef.hostView.changeDetectorRef.markForCheck();
            });
            return;
          }
          insertAfter(element.cloneNode(true), this.elementRef.nativeElement);
        } );
      });
    } else {
      cache[this.pointer] = this.dcl.loadNextToLocation(JsonSchema, this.elementRef).then((compRef) => {
        compRef.instance.pointer = this.pointer;
        compRef.hostView.changeDetectorRef.markForCheck();
        return compRef;
      });
    }
  }

  ngAfterViewInit() {
    if (!this.auto) return;
    this.loadCached();
  }
}

function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

JsonSchemaLazy.parameters = [[ElementRef], [DynamicComponentLoader]];