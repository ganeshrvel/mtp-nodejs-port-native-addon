{
   "targets":[
      {
         "includes":[
            "auto.gypi"
         ],
         "include_dirs":[
            "<(module_root_dir)/src/native/inc"
         ],
         "sources":[
            "src/native/mtp.cc"
         ],
         "libraries":[
			"/Users/ganeshr/my-foss/mtp-nodejs-port-native-addon/src/native/lib/libmtp.9.dylib"
			#"-L/Users/ganeshr/my-foss/mtp-nodejs-port-native-addon/src/native/lib/libmtp.9.dylib"
		 ],
		 "ldflags": [
		 "-Wl,-rpath,/Users/ganeshr/my-foss/mtp-nodejs-port-native-addon/src/native/lib/libmtp.a",
		 "-Wl,-rpath,/Users/ganeshr/my-foss/mtp-nodejs-port-native-addon/src/native/lib/libusb.a",
		 ],
         "cflags!": [ "-fno-exceptions" ],
		 "cflags_cc!": [ "-fno-exceptions" ],
      }
   ],
   "includes":[
      "auto-top.gypi"
   ]
}
