/*
Hyperledger Cactus Plugin - Connector Polkadot

Can perform basic tasks on a Polkadot parachain

API version: 2.0.0-rc.3
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package cactus-plugin-ledger-connector-polkadot

import (
	"encoding/json"
)

// checks if the RawTransactionRequest type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &RawTransactionRequest{}

// RawTransactionRequest struct for RawTransactionRequest
type RawTransactionRequest struct {
	To string `json:"to"`
	Value float32 `json:"value"`
}

// NewRawTransactionRequest instantiates a new RawTransactionRequest object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewRawTransactionRequest(to string, value float32) *RawTransactionRequest {
	this := RawTransactionRequest{}
	this.To = to
	this.Value = value
	return &this
}

// NewRawTransactionRequestWithDefaults instantiates a new RawTransactionRequest object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewRawTransactionRequestWithDefaults() *RawTransactionRequest {
	this := RawTransactionRequest{}
	return &this
}

// GetTo returns the To field value
func (o *RawTransactionRequest) GetTo() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.To
}

// GetToOk returns a tuple with the To field value
// and a boolean to check if the value has been set.
func (o *RawTransactionRequest) GetToOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.To, true
}

// SetTo sets field value
func (o *RawTransactionRequest) SetTo(v string) {
	o.To = v
}

// GetValue returns the Value field value
func (o *RawTransactionRequest) GetValue() float32 {
	if o == nil {
		var ret float32
		return ret
	}

	return o.Value
}

// GetValueOk returns a tuple with the Value field value
// and a boolean to check if the value has been set.
func (o *RawTransactionRequest) GetValueOk() (*float32, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Value, true
}

// SetValue sets field value
func (o *RawTransactionRequest) SetValue(v float32) {
	o.Value = v
}

func (o RawTransactionRequest) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o RawTransactionRequest) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	toSerialize["to"] = o.To
	toSerialize["value"] = o.Value
	return toSerialize, nil
}

type NullableRawTransactionRequest struct {
	value *RawTransactionRequest
	isSet bool
}

func (v NullableRawTransactionRequest) Get() *RawTransactionRequest {
	return v.value
}

func (v *NullableRawTransactionRequest) Set(val *RawTransactionRequest) {
	v.value = val
	v.isSet = true
}

func (v NullableRawTransactionRequest) IsSet() bool {
	return v.isSet
}

func (v *NullableRawTransactionRequest) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableRawTransactionRequest(val *RawTransactionRequest) *NullableRawTransactionRequest {
	return &NullableRawTransactionRequest{value: val, isSet: true}
}

func (v NullableRawTransactionRequest) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableRawTransactionRequest) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}

