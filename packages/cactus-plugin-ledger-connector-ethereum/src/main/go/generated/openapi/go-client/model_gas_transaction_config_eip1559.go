/*
Hyperledger Cacti Plugin - Connector Ethereum

Can perform basic tasks on a Ethereum ledger

API version: 2.1.0
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package cactus-plugin-ledger-connector-ethereum

import (
	"encoding/json"
)

// checks if the GasTransactionConfigEIP1559 type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &GasTransactionConfigEIP1559{}

// GasTransactionConfigEIP1559 Transaction gas settings in networks after EIP-1559 (London fork).
type GasTransactionConfigEIP1559 struct {
	// A maximum amount of gas a user is willing to provide for the execution of the transaction.
	GasLimit *string `json:"gasLimit,omitempty"`
	// A maximum fee (including the base fee and the tip) a user is willing to pay per unit of gas.
	MaxFeePerGas *string `json:"maxFeePerGas,omitempty"`
	// A maximum tip amount a user is willing to pay per unit of gas.
	MaxPriorityFeePerGas *string `json:"maxPriorityFeePerGas,omitempty"`
}

// NewGasTransactionConfigEIP1559 instantiates a new GasTransactionConfigEIP1559 object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewGasTransactionConfigEIP1559() *GasTransactionConfigEIP1559 {
	this := GasTransactionConfigEIP1559{}
	return &this
}

// NewGasTransactionConfigEIP1559WithDefaults instantiates a new GasTransactionConfigEIP1559 object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewGasTransactionConfigEIP1559WithDefaults() *GasTransactionConfigEIP1559 {
	this := GasTransactionConfigEIP1559{}
	return &this
}

// GetGasLimit returns the GasLimit field value if set, zero value otherwise.
func (o *GasTransactionConfigEIP1559) GetGasLimit() string {
	if o == nil || IsNil(o.GasLimit) {
		var ret string
		return ret
	}
	return *o.GasLimit
}

// GetGasLimitOk returns a tuple with the GasLimit field value if set, nil otherwise
// and a boolean to check if the value has been set.
func (o *GasTransactionConfigEIP1559) GetGasLimitOk() (*string, bool) {
	if o == nil || IsNil(o.GasLimit) {
		return nil, false
	}
	return o.GasLimit, true
}

// HasGasLimit returns a boolean if a field has been set.
func (o *GasTransactionConfigEIP1559) HasGasLimit() bool {
	if o != nil && !IsNil(o.GasLimit) {
		return true
	}

	return false
}

// SetGasLimit gets a reference to the given string and assigns it to the GasLimit field.
func (o *GasTransactionConfigEIP1559) SetGasLimit(v string) {
	o.GasLimit = &v
}

// GetMaxFeePerGas returns the MaxFeePerGas field value if set, zero value otherwise.
func (o *GasTransactionConfigEIP1559) GetMaxFeePerGas() string {
	if o == nil || IsNil(o.MaxFeePerGas) {
		var ret string
		return ret
	}
	return *o.MaxFeePerGas
}

// GetMaxFeePerGasOk returns a tuple with the MaxFeePerGas field value if set, nil otherwise
// and a boolean to check if the value has been set.
func (o *GasTransactionConfigEIP1559) GetMaxFeePerGasOk() (*string, bool) {
	if o == nil || IsNil(o.MaxFeePerGas) {
		return nil, false
	}
	return o.MaxFeePerGas, true
}

// HasMaxFeePerGas returns a boolean if a field has been set.
func (o *GasTransactionConfigEIP1559) HasMaxFeePerGas() bool {
	if o != nil && !IsNil(o.MaxFeePerGas) {
		return true
	}

	return false
}

// SetMaxFeePerGas gets a reference to the given string and assigns it to the MaxFeePerGas field.
func (o *GasTransactionConfigEIP1559) SetMaxFeePerGas(v string) {
	o.MaxFeePerGas = &v
}

// GetMaxPriorityFeePerGas returns the MaxPriorityFeePerGas field value if set, zero value otherwise.
func (o *GasTransactionConfigEIP1559) GetMaxPriorityFeePerGas() string {
	if o == nil || IsNil(o.MaxPriorityFeePerGas) {
		var ret string
		return ret
	}
	return *o.MaxPriorityFeePerGas
}

// GetMaxPriorityFeePerGasOk returns a tuple with the MaxPriorityFeePerGas field value if set, nil otherwise
// and a boolean to check if the value has been set.
func (o *GasTransactionConfigEIP1559) GetMaxPriorityFeePerGasOk() (*string, bool) {
	if o == nil || IsNil(o.MaxPriorityFeePerGas) {
		return nil, false
	}
	return o.MaxPriorityFeePerGas, true
}

// HasMaxPriorityFeePerGas returns a boolean if a field has been set.
func (o *GasTransactionConfigEIP1559) HasMaxPriorityFeePerGas() bool {
	if o != nil && !IsNil(o.MaxPriorityFeePerGas) {
		return true
	}

	return false
}

// SetMaxPriorityFeePerGas gets a reference to the given string and assigns it to the MaxPriorityFeePerGas field.
func (o *GasTransactionConfigEIP1559) SetMaxPriorityFeePerGas(v string) {
	o.MaxPriorityFeePerGas = &v
}

func (o GasTransactionConfigEIP1559) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o GasTransactionConfigEIP1559) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	if !IsNil(o.GasLimit) {
		toSerialize["gasLimit"] = o.GasLimit
	}
	if !IsNil(o.MaxFeePerGas) {
		toSerialize["maxFeePerGas"] = o.MaxFeePerGas
	}
	if !IsNil(o.MaxPriorityFeePerGas) {
		toSerialize["maxPriorityFeePerGas"] = o.MaxPriorityFeePerGas
	}
	return toSerialize, nil
}

type NullableGasTransactionConfigEIP1559 struct {
	value *GasTransactionConfigEIP1559
	isSet bool
}

func (v NullableGasTransactionConfigEIP1559) Get() *GasTransactionConfigEIP1559 {
	return v.value
}

func (v *NullableGasTransactionConfigEIP1559) Set(val *GasTransactionConfigEIP1559) {
	v.value = val
	v.isSet = true
}

func (v NullableGasTransactionConfigEIP1559) IsSet() bool {
	return v.isSet
}

func (v *NullableGasTransactionConfigEIP1559) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableGasTransactionConfigEIP1559(val *GasTransactionConfigEIP1559) *NullableGasTransactionConfigEIP1559 {
	return &NullableGasTransactionConfigEIP1559{value: val, isSet: true}
}

func (v NullableGasTransactionConfigEIP1559) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableGasTransactionConfigEIP1559) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}


