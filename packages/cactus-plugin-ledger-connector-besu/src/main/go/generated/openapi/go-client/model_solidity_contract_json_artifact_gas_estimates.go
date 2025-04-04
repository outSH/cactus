/*
Hyperledger Cactus Plugin - Connector Besu

Can perform basic tasks on a Besu ledger

API version: 2.1.0
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package cactus-plugin-ledger-connector-besu

import (
	"encoding/json"
)

// checks if the SolidityContractJsonArtifactGasEstimates type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &SolidityContractJsonArtifactGasEstimates{}

// SolidityContractJsonArtifactGasEstimates struct for SolidityContractJsonArtifactGasEstimates
type SolidityContractJsonArtifactGasEstimates struct {
	Creation *SolidityContractJsonArtifactGasEstimatesCreation `json:"creation,omitempty"`
	External map[string]interface{} `json:"external,omitempty"`
}

// NewSolidityContractJsonArtifactGasEstimates instantiates a new SolidityContractJsonArtifactGasEstimates object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewSolidityContractJsonArtifactGasEstimates() *SolidityContractJsonArtifactGasEstimates {
	this := SolidityContractJsonArtifactGasEstimates{}
	return &this
}

// NewSolidityContractJsonArtifactGasEstimatesWithDefaults instantiates a new SolidityContractJsonArtifactGasEstimates object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewSolidityContractJsonArtifactGasEstimatesWithDefaults() *SolidityContractJsonArtifactGasEstimates {
	this := SolidityContractJsonArtifactGasEstimates{}
	return &this
}

// GetCreation returns the Creation field value if set, zero value otherwise.
func (o *SolidityContractJsonArtifactGasEstimates) GetCreation() SolidityContractJsonArtifactGasEstimatesCreation {
	if o == nil || IsNil(o.Creation) {
		var ret SolidityContractJsonArtifactGasEstimatesCreation
		return ret
	}
	return *o.Creation
}

// GetCreationOk returns a tuple with the Creation field value if set, nil otherwise
// and a boolean to check if the value has been set.
func (o *SolidityContractJsonArtifactGasEstimates) GetCreationOk() (*SolidityContractJsonArtifactGasEstimatesCreation, bool) {
	if o == nil || IsNil(o.Creation) {
		return nil, false
	}
	return o.Creation, true
}

// HasCreation returns a boolean if a field has been set.
func (o *SolidityContractJsonArtifactGasEstimates) HasCreation() bool {
	if o != nil && !IsNil(o.Creation) {
		return true
	}

	return false
}

// SetCreation gets a reference to the given SolidityContractJsonArtifactGasEstimatesCreation and assigns it to the Creation field.
func (o *SolidityContractJsonArtifactGasEstimates) SetCreation(v SolidityContractJsonArtifactGasEstimatesCreation) {
	o.Creation = &v
}

// GetExternal returns the External field value if set, zero value otherwise.
func (o *SolidityContractJsonArtifactGasEstimates) GetExternal() map[string]interface{} {
	if o == nil || IsNil(o.External) {
		var ret map[string]interface{}
		return ret
	}
	return o.External
}

// GetExternalOk returns a tuple with the External field value if set, nil otherwise
// and a boolean to check if the value has been set.
func (o *SolidityContractJsonArtifactGasEstimates) GetExternalOk() (map[string]interface{}, bool) {
	if o == nil || IsNil(o.External) {
		return map[string]interface{}{}, false
	}
	return o.External, true
}

// HasExternal returns a boolean if a field has been set.
func (o *SolidityContractJsonArtifactGasEstimates) HasExternal() bool {
	if o != nil && !IsNil(o.External) {
		return true
	}

	return false
}

// SetExternal gets a reference to the given map[string]interface{} and assigns it to the External field.
func (o *SolidityContractJsonArtifactGasEstimates) SetExternal(v map[string]interface{}) {
	o.External = v
}

func (o SolidityContractJsonArtifactGasEstimates) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o SolidityContractJsonArtifactGasEstimates) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	if !IsNil(o.Creation) {
		toSerialize["creation"] = o.Creation
	}
	if !IsNil(o.External) {
		toSerialize["external"] = o.External
	}
	return toSerialize, nil
}

type NullableSolidityContractJsonArtifactGasEstimates struct {
	value *SolidityContractJsonArtifactGasEstimates
	isSet bool
}

func (v NullableSolidityContractJsonArtifactGasEstimates) Get() *SolidityContractJsonArtifactGasEstimates {
	return v.value
}

func (v *NullableSolidityContractJsonArtifactGasEstimates) Set(val *SolidityContractJsonArtifactGasEstimates) {
	v.value = val
	v.isSet = true
}

func (v NullableSolidityContractJsonArtifactGasEstimates) IsSet() bool {
	return v.isSet
}

func (v *NullableSolidityContractJsonArtifactGasEstimates) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableSolidityContractJsonArtifactGasEstimates(val *SolidityContractJsonArtifactGasEstimates) *NullableSolidityContractJsonArtifactGasEstimates {
	return &NullableSolidityContractJsonArtifactGasEstimates{value: val, isSet: true}
}

func (v NullableSolidityContractJsonArtifactGasEstimates) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableSolidityContractJsonArtifactGasEstimates) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}


