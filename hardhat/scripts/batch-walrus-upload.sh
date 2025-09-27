#!/bin/bash

# Upload all pets to Walrus with proper tracking
echo "🌊 Starting batch Walrus upload for all 7 pets..."

RESULTS_FILE="../frontend/src/contractData/WalrusRealUpload.json"
SUI_PRIVATE_KEY="suiprivkey1qrq4sypyja3epat3ktruxyfyd5a6cmtra8jcrkszvljazz02wznfk8r55ff"

# Initialize results file
cat > "$RESULTS_FILE" << 'EOF'
{
  "network": "walrus-testnet",
  "uploadedAt": "",
  "totalAssets": 7,
  "successfulUploads": 0,
  "failedUploads": 0,
  "assets": []
}
EOF

# Pet info arrays
PET_NAMES=("Pixel Pup" "Cyber Cat" "Mystic Mare" "Thunder Wolf" "Crystal Dragon" "Phoenix Rising" "Cosmic Guardian")
PET_TIERS=("COMMON" "COMMON" "RARE" "RARE" "EPIC" "EPIC" "LEGENDARY")

# Pet 1 is already uploaded
echo "📁 Pet 1: Pixel Pup (already uploaded)"
echo "  Image: YkKAQ_eHB14dCD2SfOkH23XSNoWhokjYIfdXakAs_nA"
echo "  Metadata: 9GZeyMdFsqP9YgdLmSe1JbBqinDYg6ks-efcXdLeFnI"

# Upload remaining pets (2-7)
for i in {2..7}; do
    echo ""
    echo "📤 Uploading Pet $i: ${PET_NAMES[$((i-1))]}..."
    
    # Upload image
    echo "  - Uploading image..."
    IMAGE_OUTPUT=$(echo "$SUI_PRIVATE_KEY" | walrus store --epochs 5 --permanent "../frontend/public/images/pet$i.webp" 2>&1)
    if [[ $? -eq 0 ]]; then
        IMAGE_BLOB_ID=$(echo "$IMAGE_OUTPUT" | grep "Blob ID:" | sed 's/.*Blob ID: //')
        echo "  ✅ Image: $IMAGE_BLOB_ID"
    else
        echo "  ❌ Image upload failed"
        continue
    fi
    
    # Upload metadata
    echo "  - Uploading metadata..."
    METADATA_OUTPUT=$(echo "$SUI_PRIVATE_KEY" | walrus store --epochs 5 --permanent "../frontend/public/metadata/pet$i.json" 2>&1)
    if [[ $? -eq 0 ]]; then
        METADATA_BLOB_ID=$(echo "$METADATA_OUTPUT" | grep "Blob ID:" | sed 's/.*Blob ID: //')
        echo "  ✅ Metadata: $METADATA_BLOB_ID"
        echo "  🎉 Pet $i uploaded successfully!"
    else
        echo "  ❌ Metadata upload failed"
        continue
    fi
done

echo ""
echo "🎉 Batch upload completed!"
echo "Check Walruscan to verify all blob IDs are accessible."