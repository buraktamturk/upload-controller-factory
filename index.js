(function(root, factory) {
  if(typeof define === 'function' && define.amd) {
    define([], factory);
  } else if(typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.UploadControllerFactory = factory();
  }
})(this, function() {
  var factory = function(config) {
    var valueKey = (config && config.valueKey) || 'id';
    var srcKey = (config && config.srcKey) || 'access_url';
    var lengthKey = (config && config.lengthKey) || 'size';
    var nameKey = (config && config.nameKey) || 'name';

    var fields = config.fields || ['id', 'access_url', 'name', 'size'];

    var uploadFnc = config.uploader;
    if(!uploadFnc) {
      throw new Error('Please specify an upload method.');
    }

    class UploadController {
      constructor(data) {
        this.listeners = [];

        if(data) {
          for(var key of fields) {
            this[key] = data[key];
          }
        }

        this.$state = this[valueKey] ? 3 : 1;

        if(this.$state === 3) {
          this.$name = this[nameKey];
          this.$size = this[lengthKey];
          this.$src = this[srcKey];
          this.$value = this[valueKey];
        }
      }

      async upload(name, contentType, blob) {
        await this.cancel();

        this.name = name;

        var previous = {};

        for(var key of fields) {
          previous[key] = this[key];
        }

        for(var key of ['$name', '$value', '$src', '$size']) {
          previous[key] = this[key];
        }

        previous.$state = this.$state;
        previous.$blob = this.$blob;
        previous.$blob_url = this.$blob_url;

        this.$abort = new AbortController();

        try {
            this.$blob = blob;
            this.$blob_url = URL.createObjectURL(blob);
            this.$state = 2;
            this.$size = blob.size;

            this.$pr = 0;

            this.notify();

            var data = await uploadFnc(name, blob, contentType, this.$abort.signal, (a) => {
              this.$pr = a;
              this.notify();
            });

            this.$pr = 1;

            this.$state = 3;

            for(var key of fields) {
              this[key] = data[key];
            }

            if(this.$state === 3) {
              nameKey && (this.$name = this[nameKey]);
              lengthKey && (this.$size = this[lengthKey]);
              this.$src = this[srcKey];
              this.$value = this[valueKey];
            }

            this.notify();
        } catch (e) {
          for(var key in previous) {
            this[key] = previous[key];
          }

          this.notify();
        } finally { 
          this.$abort = null;
        }
      }

      notify() {
        for(var i = 0; i < this.listeners.length; ++i) {
          (this.listeners[i])(this);
        }
      }

      async remove() {
        await this.cancel();

        this.$blob = null;
        this.$blob_url = null;
        this.$state = 1;

        for(let key of fields) {
          delete this[key];
        }

        this.notify();
      }

      async cancel() {
        if (this.$abort) {
          var task = this.$lastTask;
          this.$abort.abort();
          await task;
        }
      }

      addListener(listener) {
        if(this.listeners.indexOf(listener) == -1) {
          this.listeners.push(listener);
          listener(this);
        } else {
          throw new Error('Same listener is connected.');
        }
      }

      removeListener(listener) {
        var index = this.listeners.indexOf(listener);
        if(index != -1) {
          this.listeners.splice(index, 1);
        } else {
          throw new Error('Listener is not connected');
        }
      }

      resolve() {
        return this.$state === 1 ? Promise.resolve(null) :
            this.$state === 3 ? Promise.resolve(this) : new Promise((resolve) => {
              var fnc = () => {
                if(this.$state == 2)
                  return;

                if(this.$state == 1) {
                  resolve(null);
                } else if(this.$state == 3) {
                  resolve(this);
                }

                this.removeListener(fnc);
              };

              this.addListener(fnc);
            });
      }

      static async resolve_all(array) {
        return (await Promise.all(
          array
            .filter(a => a)
            .map(a => a.resolve())))
              .filter(a => a);
      }

      toJSON() {
        if(this.$state !== 3) {
          return null;
        }

        var data = {};

        for(var key of fields) {
          data[key] = this[key];
        }

        return data;
      }
    };

    var fnc = function(data) {
      return data && (data instanceof UploadController) ? data : new UploadController(data);
    };

    fnc.new = function(data) {
      var obj = {};
      obj[valueKey] = data.$value;
      obj[srcKey] = data.$src;
      nameKey && (obj[nameKey] = data.$name);
      lengthKey && (obj[lengthKey] = data.$size);
      return fnc(obj);
    };

    fnc.valueKey = valueKey;
    fnc.srcKey = srcKey;
    fnc.lengthKey = lengthKey;
    fnc.nameKey = nameKey;

    fnc.resolve_all = UploadController.resolve_all;

    return fnc;
  };

  factory.XHR = function(config) {
    var xhrMethod = config.xhrMethod || 'POST';

    if(!config.xhrUrl) {
      throw new Error('Please provide URL.')
    }

    var xhrUrl = config.xhrUrl;
    var xhrAsFormData = config.xhrAsFormData || false;
    var xhrFormDataNameKey = config.xhrFormDataNameKey;
    var xhrFormDataFileKey = config.xhrFormDataFileKey || 'file';
    var xhrCallback = config.xhrCallback;
  
    return async function(name, blob, contentType, abort, progress) {
      return await new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();

        abort.onabort = function() {
          xhr.onreadystatechange = null;
          xhr.abort();
          reject(new Error('Aborted!'));
        };
  
        xhr.upload.onprogress = xhr.upload.onloadstart = function(e) {
          progress(e.loaded / e.total);
        };
  
        xhr.onreadystatechange = function(e) {
          if (this.readyState === XMLHttpRequest.DONE) {
            if(this.status === 200) {
              try {
                var data = JSON.parse(this.responseText);
                if(data == null)
                  reject();
                else
                  resolve(data);
              } catch(e) {
                reject(e);
              }
            } else {
              reject(this);
            }
          }
        };

        xhr.open(xhrMethod, xhrUrl.replace('$file', encodeURIComponent(name)), true);
  
        if(xhrCallback) {
          xhrCallback(xhr);
        }
  
        if(xhrAsFormData) {
          var formData = new FormData();
          xhrFormDataNameKey && formData.append(xhrFormDataNameKey, name);
          formData.append(xhrFormDataFileKey, blob, name);
          xhr.send(formData);
        } else {
          xhr.setRequestHeader("Content-Type", contentType);
          xhr.send(blob);
        }
      });
    };
  };

  return factory;
});
