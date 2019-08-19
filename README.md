# UploadController

JavaScript file uploading mechanism with default (optional) XHR backend. To be consumed by file picker and image picker components.

## Usage

```javascript

  var UploadControllerFactory = require('uploadcontroller');

  var UploadController = UploadControllerFactory({

    // specify a built in upload method,
    upload: UploadControllerFactory.XHR({
      xhrUrl: 'http://localhost/upload.php?filename=$file', // you can use $file to put file name to the URL
      xhrAsFormData: true, // if true, it sends the file as multipart data. Otherwise the whole file is sent as a body with correct mime type
      xhrFormDataFileKey: 'file', // if xhrAsFormData true, 

      xhrMethod: 'POST', // default
      xhrHeaders: {}, // extra headers to be sent
      xhrCallback: function(xhr) { }, // XHR hook before sending data
    })

    // or a customized one
    upload: function(name, blob, contentType, abort, progress) {
      // Disables XHR and enables custom uploading backend.
      // Function must return a promise that will resolve with a javascript object.
      // when the user aborts the uploading, the AbortSignal is fired.
      // upload progress can be reported back to library by calling progress function which accepts numbers from 0 to 1 (i.e. progress(50 / 100) means half of the upload is completed).
    },

    valueKey: 'id', 
    srcKey: 'access_url', 

    fields: ['id', 'access_url', 'name', 'size'] // save additional data from response, so they can be accessed from JavaScript with UploadController inside
  });

  var file1 = UploadController();

  // attach file1 to file picker component or image component
  // or

  file1.upload(name, contentType, blob); // start upload selected file
  // returns promise on finish

  // file1.$state = 1 is empty, 2 is uploading, 3 is finished
  // file1.$pr = Upload progress report: 0 is 0% percent, 1 is 100% percent
  // file1.$blob_url = Locally cached Blob resource, can be used in <img> tags or to display a PDF in a new window.

  file1.addListener(function() {
    // track the controller
  });

  // defines already uploaded file
  var file2 = UploadController({ id: 1, access_url: 'https://www.gstatic.com/webp/gallery/2.jpg' });
  // can be attached to file picker component or image component, and the component will show the previously selected file.
```

## License

© 2019 [Burak Tamturk](https://buraktamturk.org/)

Released under the [MIT LICENSE](http://opensource.org/licenses/MIT)