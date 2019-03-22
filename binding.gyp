{
  "targets": [
    {
      "includes": [
        "auto.gypi"
      ],
      "sources": [
        "src/mtp.cc"
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
