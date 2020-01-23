{
  "targets": [
	{
	  "includes": [
		"auto.gypi"
	  ],
	  "sources": [
		"src/native/mtp.cc"
	  ],
	  "libraries": [
		"<!@(pkg-config libmtp --libs)"
	  ]
	}
  ],
  "includes": [
	"auto-top.gypi"
  ]
}
