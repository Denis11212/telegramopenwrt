#
# Copyright (C) 2024 Denis11212
#
# This is free software, licensed under the GNU General Public License v2.
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI interface for Telegram Scripts for OpenWrt
LUCI_DEPENDS:=+telegram-openwrt +luci-base +rpcd +curl +jsonfilter

PKG_LICENSE:=GPL-2.0
PKG_MAINTAINER:=Denis11212

# КРИТИЧНО: используем $(TOPDIR) вместо относительного пути ../../
include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
